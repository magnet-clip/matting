import torch
from torch.utils.data import Dataset, DataLoader
from torch import nn
from torch import optim as opt
from pathlib import Path
import pickle
from torchvision.transforms import functional as tf

try:
    __IPYTHON__  # type: ignore # noqa: F821
    from tqdm.notebook import tqdm
except Exception:
    from tqdm import tqdm

import cv2
import numpy as np

import sys
import os

sys.path.insert(0, "./sam2")

from sam2.build_sam import build_sam2_video_predictor


sam2_checkpoint = "./sam2/checkpoints/sam2.1_hiera_large.pt"
model_cfg = "configs/sam2.1/sam2.1_hiera_l.yaml"


def is_truthy(val):
    if val is None:
        return False

    if isinstance(val, bool):
        return val

    return True


class MattingUNet3(nn.Module):
    def __init__(self, use_sigmoid=False):
        super(MattingUNet3, self).__init__()
        self.use_sigmoid = use_sigmoid
        self.dummy = nn.Parameter()
        # Encoder
        self.enc1 = self.conv_block(36, 64, shrink=False)
        self.enc2 = self.conv_block(64, 128)
        self.enc3 = self.conv_block(128, 256)

        # Bottleneck
        self.bottleneck = self.conv_block(256, 512)

        # Decoder
        self.up3 = self.up_conv(512, 256)
        self.dec3 = self.conv_block(512, 256, shrink=False)

        self.up2 = self.up_conv(256, 128)
        self.dec2 = self.conv_block(256, 128, shrink=False)

        self.up1 = self.up_conv(128, 64)
        self.dec1 = self.conv_block(128, 64, shrink=False)

        # Output layer
        self.final = nn.Conv2d(64, 1, kernel_size=1)
        self.sigmoid = nn.Sigmoid()

    def conv_block(self, in_channels, out_channels, shrink=True):  # keeps size
        res = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1),  # 0
            nn.BatchNorm2d(out_channels),  # 1
            nn.LeakyReLU(0.02, inplace=True),  # 2
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1),  # 3
            nn.BatchNorm2d(out_channels),  # 4
            nn.LeakyReLU(0.02, inplace=True),  # 5
        )
        if shrink:
            res.append(
                nn.Sequential(
                    nn.Conv2d(  # 6.0
                        out_channels, out_channels, kernel_size=3, stride=2, padding=1
                    ),
                    nn.BatchNorm2d(out_channels),  # 6.1
                    nn.LeakyReLU(0.02, inplace=True),  # 6.2
                )
            )
        return res

    def up_conv(self, in_channels, out_channels):  # doubles size
        return nn.ConvTranspose2d(in_channels, out_channels, kernel_size=2, stride=2)

    def forward(self, image, segmentation, features):
        x = torch.cat([image, segmentation, features], dim=1)  # .to(self.dummy.device)
        # Encoder
        e1 = self.enc1(x)  # 256
        e2 = self.enc2(e1)  # 128
        e3 = self.enc3(e2)  # 64

        # Bottleneck
        b = self.bottleneck(e3)  # 16

        # Decoder
        d3 = self.dec3(torch.cat([self.up3(b), e3], dim=1))  # 64
        d2 = self.dec2(torch.cat([self.up2(d3), e2], dim=1))  # 128
        d1 = self.dec1(torch.cat([self.up1(d2), e1], dim=1))  # 256

        # Output
        res = self.final(d1)
        out = self.sigmoid(res) if self.use_sigmoid else res
        return out


class SamVideoParser:
    def __init__(self, device):
        super().__init__()
        self.device = device

    def video(self, video: Path, points=None, box=None, start=0):
        predictor = build_sam2_video_predictor(
            model_cfg, sam2_checkpoint, device=self.device
        )

        inference_state = predictor.init_state(video_path=str(video))

        if points is not None:
            (
                frame_idx,
                _,
                mask_logits,
                _,
                vision_feats,
                vision_embeds,
                feat_sizes,
            ) = predictor.add_new_points_or_box(
                inference_state=inference_state,
                frame_idx=start,
                obj_id=1,
                points=points,
                labels=np.array([1] * len(points), np.int32),
            )
        elif box is not None:
            (
                frame_idx,
                _,
                mask_logits,
                _,
                vision_feats,
                vision_embeds,
                feat_sizes,
            ) = predictor.add_new_points_or_box(
                inference_state=inference_state,
                frame_idx=0,
                obj_id=1,
                box=box,
            )
        mask_logits = mask_logits.detach().cpu().numpy()[0, 0, :]
        vision_feats = [x.detach().cpu().numpy() for x in vision_feats]
        yield frame_idx, mask_logits, vision_feats, feat_sizes

        for output in predictor.propagate_in_video(
            inference_state, start_frame_idx=start + 1
        ):
            (
                frame_idx,
                _,
                mask_logits,
                _,
                vision_feats,
                vision_embeds,
                feat_sizes,
            ) = output
            mask_logits = mask_logits.detach().cpu().numpy()[0, 0, :]
            vision_feats = [x.detach().cpu().numpy() for x in vision_feats]
            yield frame_idx, mask_logits, vision_feats, feat_sizes


def get_random_points(file_or_image: np.ndarray | Path | str, num_points: int):
    if isinstance(file_or_image, np.ndarray):
        image = file_or_image
    else:
        image = cv2.imread(str(file_or_image), cv2.IMREAD_UNCHANGED)

    image = cv2.erode(image, (15, 15))

    ones_positions = np.argwhere(image == 255)
    # TODO should I try to make sure points are selected somewhere in the middle?
    random_pos = np.array(
        ones_positions[np.random.choice(len(ones_positions), num_points)],
        np.float32,
    )
    return image, random_pos


def get_all_files(folder: Path, every=1):
    video_folders = [
        x
        for x in folder.glob("*")
        if x.is_dir() and x.name.endswith("+")  # not x.name.endswith(("!", "?"))
    ]
    res = []
    for video_folder in video_folders:
        frame_numbers = [
            (video_folder, name)
            for x in (video_folder / "frames").glob("*.*")
            for name in [x.name.split(".")[0]]
            if x.is_file() and int(name) % every == 0
        ]
        res.extend(frame_numbers)

    return res


def get_train_data(folder: Path, frame: str):
    image = cv2.imread(str(folder / "frames" / f"{frame}.jpg"), cv2.IMREAD_UNCHANGED)
    matting = cv2.imread(str(folder / "matting" / f"{frame}.jpg"), cv2.IMREAD_UNCHANGED)
    seg = cv2.imread(str(folder / "seg" / f"{frame}.jpg"), cv2.IMREAD_UNCHANGED)

    with open(str(folder / "feat" / f"{frame}.pkl"), "rb") as fh:
        features = pickle.load(fh)

    return image, matting, seg, features["feats"], torch.tensor(features["sizes"])


class MattingDataset(Dataset):
    def __init__(self, files, max_files: int = None, transforms=None, th=0.05, r=5):
        super().__init__()
        self.files = files if max_files is None else files[:max_files]
        self.transforms = transforms
        self.th = th
        self.kernel = np.ones((r, r), np.uint8)

    def __getitem__(self, index):
        data = get_train_data(*self.files[index])
        image, matting, seg, feats, sizes = data

        image = tf.to_tensor(image)  # 3xHxW, 0-1
        matting = tf.to_tensor(matting)  # 1xHxW, 0-1
        seg = tf.to_tensor(seg)  # 1xHxW, 0-1
        feats = tf.resize(
            tf.to_tensor(feats[0]).view(-1, *sizes[0]), image.shape[1:]
        )  # NxHxW

        if self.transforms is not None:
            item = torch.cat([matting, seg, image, feats])
            item = self.transforms(item)
            matting = item[0][None, :, :]

            seg = item[1][None, :, :]
            image = item[2:5]
            feats = item[5:]

        aoi = (
            ((matting > self.th) & (matting < 1 - self.th))
            .permute(1, 2, 0)
            .detach()
            .cpu()
            .numpy()
            .astype(np.float32)
        )
        aoi = cv2.dilate(aoi, self.kernel)
        aoi = cv2.erode(aoi, self.kernel)
        aoi = torch.tensor(aoi, dtype=torch.bool)[None, :]

        return matting, seg, image, feats, aoi

    def __len__(self):
        return len(self.files)


class MattingPredictor:
    def __init__(self, parser: SamVideoParser, model: MattingUNet3, device: str):
        self.parser = parser
        self.model = model
        self.device = device

    @torch.no_grad()
    def predict_frames(
        self,
        frames_folder: Path,
        points,
        start: int = 0,
        finish: int = None,
        resize_to=None,
    ):
        images = [x for x in frames_folder.glob("*.*")]
        for frame_idx, mask_logits, vision_feats, feat_sizes in self.parser.video(
            frames_folder, points, start=start
        ):
            image = cv2.imread(str(images[frame_idx]), cv2.IMREAD_UNCHANGED)
            original_size = image.shape[:2]

            if image.shape[2] == 4:
                image = image[:, :, :-1]
            image = tf.to_tensor(image).to(self.device)

            segment = tf.to_tensor(mask_logits).to(self.device)

            segment -= segment.min()
            segment /= segment.max()

            feats = (
                tf.to_tensor(vision_feats[0]).view(-1, *feat_sizes[0]).to(self.device)
            )

            if resize_to is not None:
                image = tf.resize(image, resize_to)
                segment = tf.resize(segment, resize_to)
                feats = tf.resize(feats, resize_to)
            else:
                feats = tf.resize(feats, original_size)

            matting = self.model.forward(
                image[None, :], segment[:, None], feats[None, :]
            )

            if resize_to is not None:
                matting = tf.resize(matting, original_size)

            yield (
                frame_idx,
                matting[0].permute(1, 2, 0).cpu().numpy(),
                segment.permute(1, 2, 0).cpu().numpy(),
            )

            if frame_idx + 1 == finish:
                break


class MattingUNetTrainerDistr:
    def create_dataloader(self, files, max, transforms=None):
        if max is not None and max < len(files):
            files = np.array(files)
            files = files[
                np.random.choice(files.shape[0], size=max, replace=False)
            ].tolist()
        dataset = MattingDataset(files, transforms=transforms)

        return DataLoader(dataset, batch_size=self.batch_size)

    def to_device(self, items):
        return tuple([x.to(self.device) for x in items])

    def __init__(
        self,
        model: nn.Module,
        optimizer: opt.Optimizer,
        name: str,
        load: str | bool,
        train_files,
        test_files,
        max_files,
        transforms_train,
        transforms_test,
        batch_size,
        save_every: int,
        loss_fn,
        device,
        lr,
    ):
        self.optimizer = optimizer
        self.loss_fn = loss_fn

        self.train_files = train_files
        self.test_files = test_files
        self.max_files = max_files
        self.transforms_train = transforms_train
        self.transforms_test = transforms_test
        self.batch_size = batch_size

        self.last_epoch = 0
        self.train_losses = []
        self.test_losses = []
        self.save_every = save_every
        self.device = device

        checkpoints = Path("./checkpoints") / name
        os.makedirs(str(checkpoints), exist_ok=is_truthy(load))

        self.checkpoints = checkpoints / "models"
        self.screenshots = checkpoints / "screenshots"

        os.makedirs(str(self.checkpoints), exist_ok=True)
        os.makedirs(str(self.screenshots), exist_ok=True)

        if is_truthy(load):
            if isinstance(load, bool):
                last_checkpoint = sorted(
                    self.checkpoints.glob("*"), key=os.path.getmtime, reverse=True
                )[0]
            else:
                last_checkpoint = self.checkpoints / load

            print(f"Loading {str(last_checkpoint)}")
            self.model = torch.load(open(str(last_checkpoint / "model.pt"), "rb"))
            params = pickle.load(open(str(last_checkpoint / "params.pkl"), "rb"))
            self.set_lr(params["lr"])
            self.last_epoch = params["last_epoch"] + 1
            self.test_losses = params["test_losses"]
            self.train_losses = params["train_losses"]
        else:
            self.model = model

        if lr is not None:
            self.set_lr(lr)

        self.model = self.model.to(device)

        # self.model = model
        # DDP(model.to(rank), device_ids=[rank], find_unused_parameters=True)

    def set_lr(self, lr):
        for p in self.optimizer.param_groups:
            p["lr"] = lr

    def mul_lr(self, m):
        for p in self.optimizer.param_groups:
            p["lr"] *= m

    def get_lr(self):
        for p in self.optimizer.param_groups:
            return p["lr"]

    def save_checkpoint(self):
        folder = self.checkpoints / f"{self.last_epoch:04d}"
        os.makedirs(str(folder), exist_ok=True)
        with open(str(folder / "model.pt"), "wb") as fh:
            torch.save(self.model, fh)
        with open(str(folder / "params.pkl"), "wb") as fh:
            pickle.dump(
                {
                    "lr": self.get_lr(),
                    "last_epoch": self.last_epoch,
                    "train_losses": self.train_losses,
                    "test_losses": self.test_losses,
                },
                fh,
            )

    def loss(self, truth, prediction, matt_area):
        return self.loss_fn(
            truth[matt_area], prediction[matt_area]
        ) * 10.0 + self.loss_fn(truth[~matt_area], prediction[~matt_area])

    def save_screenshots(self, frame, segmentation, matting, predicted, num, mode):
        def get_filename(what: str):
            return str(
                self.screenshots / f"{self.last_epoch:04d}-{mode}-{num:05d}-{what}.jpg"
            )

        def normalize(img):
            img = img.to(torch.float32).detach().cpu().numpy()
            img -= img.min()
            img /= img.max()
            return (img * 255.0).astype(np.uint8)

        cv2.imwrite(get_filename("frame"), normalize(frame.permute(1, 2, 0)))
        cv2.imwrite(get_filename("seg"), normalize(segmentation.permute(1, 2, 0)))
        cv2.imwrite(get_filename("true"), normalize(matting.permute(1, 2, 0)))
        cv2.imwrite(get_filename("pred"), normalize(predicted.permute(1, 2, 0)))

    def epoch(self, mode: str):
        if mode == "train":
            loader = self.create_dataloader(
                self.train_files, self.max_files, self.transforms_train
            )
            losses = self.train_losses
            self.model.train()
        else:
            loader = self.create_dataloader(
                self.test_files, self.max_files // 2, self.transforms_test
            )
            losses = self.test_losses
            self.model.eval()

        total_loss = 0
        total_batches = 0
        with torch.set_grad_enabled(mode == "train"):
            for data in tqdm(loader, desc=mode):
                matting, mask_logits, frame, vision_feats, aoi = self.to_device(data)
                predicted = self.model(frame, mask_logits, vision_feats)

                current_loss = self.loss(matting, predicted, aoi)
                total_loss += current_loss.item()
                total_batches += 1

                if mode == "train":
                    self.optimizer.zero_grad()
                    current_loss.backward()
                    self.optimizer.step()

                # if self.rank == 0 and total_batches % self.save_every == 0:
                if total_batches % self.save_every == 0:
                    self.save_screenshots(
                        frame[0],
                        mask_logits[0],
                        matting[0],
                        predicted[0],
                        total_batches,
                        mode,
                    )

        total_loss = total_loss / total_batches
        losses.append(total_loss)

        if mode == "test":
            self.save_checkpoint()

    def train(self, num_epochs):
        for _ in tqdm(range(num_epochs), desc="epoch"):
            self.epoch("train")
            self.epoch("test")
            self.last_epoch += 1

    @torch.no_grad()
    def matting(self, folder, file):
        loader = self.create_dataloader([(Path(folder), file)], max=None)
        for data in loader:
            matting, mask_logits, frame, vision_feats, _ = self.to_device(data)
            predicted = self.model(frame, mask_logits, vision_feats)

            return matting[0].cpu().permute(1, 2, 0).numpy(), predicted[
                0
            ].cpu().permute(1, 2, 0).numpy()
