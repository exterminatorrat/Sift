from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path

from PIL import Image, ImageOps


DEFAULT_MAX_LONG_EDGE = 1600
DEFAULT_JPEG_QUALITY = 72
MAX_PAGES_PER_CASE = 4


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def stable_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def preprocess(
    source: Path,
    *,
    max_long_edge: int,
    jpeg_quality: int,
) -> tuple[bytes, tuple[int, int], tuple[int, int]]:
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened)
        source_size = image.size
        image = image.convert("RGB")
        if max(image.size) > max_long_edge:
            image.thumbnail((max_long_edge, max_long_edge), Image.Resampling.LANCZOS)
        output_size = image.size
        buffer = io.BytesIO()
        image.save(
            buffer,
            format="JPEG",
            quality=jpeg_quality,
            optimize=False,
            progressive=False,
            subsampling=2,
            exif=b"",
        )
        return buffer.getvalue(), source_size, output_size


def read_image_path(value: object, *, label: str) -> str:
    if isinstance(value, str) and value.strip():
        return value.strip()
    if isinstance(value, dict):
        image_path = value.get("path")
        if isinstance(image_path, str) and image_path.strip():
            return image_path.strip()
    raise ValueError(f"{label} must be a non-empty path string or an object with a path string.")


def read_case_images(case: object, *, root: Path) -> list[tuple[str, Path]]:
    if not isinstance(case, dict):
        raise ValueError("Every benchmark case must be a JSON object.")

    case_id = case.get("id", "unknown")
    singular_fields = [field for field in ("imagePath", "image") if field in case]
    plural_fields = [field for field in ("imagePaths", "images") if field in case]
    if singular_fields and plural_fields:
        raise ValueError(
            f"Benchmark case {case_id} ambiguously defines singular and plural image fields."
        )
    if len(singular_fields) > 1 or len(plural_fields) > 1:
        fields = singular_fields or plural_fields
        raise ValueError(
            f"Benchmark case {case_id} ambiguously defines multiple image fields: {', '.join(fields)}."
        )

    if plural_fields:
        field = plural_fields[0]
        raw_images = case[field]
        if not isinstance(raw_images, list):
            raise ValueError(f"Benchmark case {case_id} {field} must be an array.")
        source_paths = [
            read_image_path(value, label=f"Benchmark case {case_id} {field}[{index}]")
            for index, value in enumerate(raw_images)
        ]
    elif singular_fields:
        field = singular_fields[0]
        source_paths = [read_image_path(case[field], label=f"Benchmark case {case_id} {field}")]
    else:
        raise ValueError(f"Benchmark case {case_id} has no image path.")

    if not 1 <= len(source_paths) <= MAX_PAGES_PER_CASE:
        raise ValueError(
            f"Benchmark case {case_id} must define 1-{MAX_PAGES_PER_CASE} image pages."
        )

    images = []
    seen_paths = set()
    for source_path in source_paths:
        source = (root / source_path).resolve()
        normalized_path = str(source).casefold()
        if normalized_path in seen_paths:
            raise ValueError(f"Benchmark case {case_id} contains duplicate image path {source_path}.")
        seen_paths.add(normalized_path)
        if not source.is_file():
            raise ValueError(f"Benchmark case {case_id} image file is missing: {source_path}.")
        images.append((source_path, source))
    return images


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare deterministic Sift AI benchmark images.")
    parser.add_argument("--manifest", default="docs/ai-evals/benchmark-v1/development-v1.json")
    parser.add_argument("--output", default="output/ai-evals/preprocessed")
    parser.add_argument("--max-long-edge", type=int, default=DEFAULT_MAX_LONG_EDGE)
    parser.add_argument("--jpeg-quality", type=int, default=DEFAULT_JPEG_QUALITY)
    parser.add_argument("--version")
    args = parser.parse_args()

    if not 512 <= args.max_long_edge <= 4096:
        raise ValueError("--max-long-edge must be between 512 and 4096 pixels.")
    if not 40 <= args.jpeg_quality <= 95:
        raise ValueError("--jpeg-quality must be between 40 and 95.")
    preprocessing_version = args.version or (
        f"benchmark-jpeg-{args.max_long_edge}-q{args.jpeg_quality}-v1"
    )

    root = Path.cwd()
    source_manifest = root / args.manifest
    output_root = root / args.output
    output_root.mkdir(parents=True, exist_ok=True)

    source_document = json.loads(source_manifest.read_text(encoding="utf-8"))
    source_cases = source_document if isinstance(source_document, list) else source_document.get("cases")
    if not isinstance(source_cases, list):
        raise ValueError("Benchmark manifest must be an array or contain a cases array.")
    normalized_cases = [
        (case, read_case_images(case, root=root))
        for case in sorted(source_cases, key=lambda item: item["id"])
    ]
    records = []
    for case, source_images in normalized_cases:
        page_count = len(source_images)
        pages = []
        for page_index, (source_path, source) in enumerate(source_images):
            source_bytes = source.read_bytes()
            output_bytes, source_size, output_size = preprocess(
                source,
                max_long_edge=args.max_long_edge,
                jpeg_quality=args.jpeg_quality,
            )
            output_name = (
                f"{case['id']}.jpg"
                if page_count == 1
                else f"{case['id']}-p{page_index + 1:02d}.jpg"
            )
            relative_output = Path(args.output) / output_name
            output_path = output_root / output_name
            if not output_path.exists() or output_path.read_bytes() != output_bytes:
                output_path.write_bytes(output_bytes)

            pages.append(
                {
                    "pageNumber": page_index + 1,
                    "sourcePath": source_path,
                    "sourceSha256": sha256_bytes(source_bytes),
                    "sourceWidth": source_size[0],
                    "sourceHeight": source_size[1],
                    "outputPath": relative_output.as_posix(),
                    "outputSha256": sha256_bytes(output_bytes),
                    "outputBytes": len(output_bytes),
                    "outputWidth": output_size[0],
                    "outputHeight": output_size[1],
                }
            )

        record = {"caseId": case["id"]}
        if page_count == 1:
            record.update({key: value for key, value in pages[0].items() if key != "pageNumber"})
        record.update({"pageCount": page_count, "pages": pages})
        records.append(record)

    corpus_descriptor = {
        "schemaVersion": "2",
        "preprocessingVersion": preprocessing_version,
        "maxLongEdge": args.max_long_edge,
        "jpegQuality": args.jpeg_quality,
        "cases": [
            {
                "caseId": item["caseId"],
                "pages": [
                    {
                        "pageNumber": page["pageNumber"],
                        "sourceSha256": page["sourceSha256"],
                        "outputSha256": page["outputSha256"],
                    }
                    for page in item["pages"]
                ],
            }
            for item in records
        ],
    }
    manifest = {
        "schemaVersion": corpus_descriptor["schemaVersion"],
        "preprocessingVersion": preprocessing_version,
        "maxLongEdge": args.max_long_edge,
        "jpegQuality": args.jpeg_quality,
        "corpusSha256": sha256_bytes(stable_json(corpus_descriptor).encode("utf-8")),
        "cases": records,
    }
    manifest_path = output_root / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"Prepared {sum(item['pageCount'] for item in records)} images across {len(records)} cases "
        f"with {preprocessing_version}; "
        f"corpus SHA-256 {manifest['corpusSha256']}"
    )


if __name__ == "__main__":
    main()
