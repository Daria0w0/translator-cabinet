from minio import Minio
from minio.error import S3Error
import os
from typing import Optional

class MinioClient:
    def __init__(self):
        self.client = Minio(
            "localhost:9000",
            access_key="minioadmin",
            secret_key="minioadmin",
            secure=False
        )
        self.bucket_name = "translations"
        self.setup_bucket()

    def setup_bucket(self):
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                print(f"Bucket {self.bucket_name} created")
        except S3Error as e:
            print(f"Error creating bucket: {e}")
            raise

    def upload_file(self, file_path: str, object_name: str) -> Optional[str]:
        try:
            self.client.fput_object(
                self.bucket_name,
                object_name,
                file_path
            )
            return f"{self.bucket_name}/{object_name}"
        except S3Error as e:
            print(f"Error uploading file to MinIO: {e}")
            return None

    def get_file_url(self, object_name: str) -> str:
        return f"http://localhost:9000/{self.bucket_name}/{object_name}"

    def download_file(self, object_name: str, file_path: str) -> bool:
        try:
            self.client.fget_object(self.bucket_name, object_name, file_path)
            return True
        except S3Error as e:
            print(f"Error downloading file from MinIO: {e}")
            return False

minio_client = MinioClient()