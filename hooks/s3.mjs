import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const getSignedUrlController = async (req, res) => {
  try {
    const { filename, filetype } = req.body;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: filename,
      ContentType: filetype,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 }); // 60s

    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;

    res.status(200).json({ signedUrl, fileUrl });
  } catch (err) {
    console.error("Error al generar signed URL:", err);
    res.status(500).json({ error: "Error generando la URL firmada" });
  }
};
