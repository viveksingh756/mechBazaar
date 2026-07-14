import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export const uploadFileBase64 = async (req: Request, res: Response) => {
  try {
    const { file, filename } = req.body; // file is base64 string: "data:image/png;base64,iVBORw0..."
    
    if (!file || !filename) {
      return res.status(400).json({ success: false, message: 'File and filename are required' });
    }

    const matches = file.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, message: 'Invalid base64 format' });
    }

    const buffer = Buffer.from(matches[2], 'base64');
    const uploadDir = path.join(__dirname, '../../uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueName = `${Date.now()}-${filename}`;
    const filePath = path.join(uploadDir, uniqueName);
    
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${uniqueName}`;

    return res.json({ success: true, url: fileUrl });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
