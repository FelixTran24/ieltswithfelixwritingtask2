import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  detectEssayType,
  finalizeDebateOutline,
  generateBand9SampleEssay,
  generateThreeStepOutline,
  gradeEssay,
  runDebateTurn,
} from './server/geminiService.ts';

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

function formatApiError(error: unknown): { status: number; message: string } {
  const raw = error instanceof Error ? error.message : String(error);
  if (/API_KEY_INVALID|PERMISSION_DENIED|Chưa cấu hình GEMINI_API_KEY/i.test(raw)) {
    return {
      status: 400,
      message:
        'Không thể xác thực GEMINI_API_KEY. Vui lòng kiểm tra khóa API trong mục Settings > Secrets.',
    };
  }
  if (/RESOURCE_EXHAUSTED|429/i.test(raw)) {
    return {
      status: 429,
      message:
        'Hệ thống Gemini tạm thời quá tải hoặc chạm giới hạn quota. Vui lòng thử lại sau giây lát.',
    };
  }
  return {
    status: 500,
    message: raw || 'Đã xảy ra lỗi không xác định khi gọi Gemini.',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/detect-type', async (req, res) => {
    try {
      const prompt = String(req.body?.prompt ?? '').trim();
      if (prompt.length < 15) {
        return res.status(400).json({
          error: 'Vui lòng nhập đầy đủ đề bài (ít nhất 15 ký tự) trước khi nhận diện dạng đề.',
        });
      }
      const result = await detectEssayType(prompt);
      return res.json(result);
    } catch (error) {
      const { status, message } = formatApiError(error);
      return res.status(status).json({ error: message });
    }
  });

  app.post('/api/grade', async (req, res) => {
    try {
      const prompt = String(req.body?.prompt ?? '').trim();
      const essay = String(req.body?.essay ?? '').trim();
      const essayType = req.body?.essayType ?? 'auto';

      if (prompt.length < 15) {
        return res.status(400).json({
          error: 'Vui lòng dán nguyên văn đề bài trước khi chấm.',
        });
      }
      if (essay.length < 40) {
        return res.status(400).json({
          error: 'Bài viết quá ngắn. Vui lòng nhập đầy đủ bài làm IELTS Writing Task 2 để chấm chính xác.',
        });
      }

      const result = await gradeEssay({ prompt, essay, essayType });
      return res.json(result);
    } catch (error) {
      const { status, message } = formatApiError(error);
      return res.status(status).json({ error: message });
    }
  });

  app.post('/api/sample-essay', async (req, res) => {
    try {
      const prompt = String(req.body?.prompt ?? '').trim();
      const essayType = req.body?.essayType ?? 'opinion';
      const stanceLabel = req.body?.stanceLabel
        ? String(req.body.stanceLabel)
        : undefined;
      const stanceNote = req.body?.stanceNote
        ? String(req.body.stanceNote)
        : undefined;

      if (prompt.length < 15) {
        return res.status(400).json({
          error: 'Vui lòng nhập đầy đủ đề bài trước khi tạo bài mẫu.',
        });
      }

      const result = await generateBand9SampleEssay({
        prompt,
        essayType,
        stanceLabel,
        stanceNote,
      });
      return res.json(result);
    } catch (error) {
      const { status, message } = formatApiError(error);
      return res.status(status).json({ error: message });
    }
  });

  app.post('/api/debate/turn', async (req, res) => {
    try {
      const prompt = String(req.body?.prompt ?? '').trim();
      const outline = String(req.body?.outline ?? '').trim();
      const essayType = req.body?.essayType ?? 'auto';
      const history = Array.isArray(req.body?.history) ? req.body.history : [];
      const userMessage = String(req.body?.userMessage ?? '').trim();

      if (prompt.length < 15) {
        return res.status(400).json({
          error: 'Vui lòng dán nguyên văn đề bài để bắt đầu phiên tranh biện.',
        });
      }
      if (!userMessage) {
        return res.status(400).json({
          error: 'Vui lòng nhập luận điểm hoặc câu trả lời của bạn.',
        });
      }

      const result = await runDebateTurn({
        prompt,
        outline,
        essayType,
        history,
        userMessage,
      });
      return res.json(result);
    } catch (error) {
      const { status, message } = formatApiError(error);
      return res.status(status).json({ error: message });
    }
  });

  app.post('/api/debate/finalize', async (req, res) => {
    try {
      const prompt = String(req.body?.prompt ?? '').trim();
      const outline = String(req.body?.outline ?? '').trim();
      const essayType = req.body?.essayType ?? 'auto';
      const history = Array.isArray(req.body?.history) ? req.body.history : [];

      if (prompt.length < 15) {
        return res.status(400).json({
          error: 'Cần có đề bài trước khi chốt dàn ý.',
        });
      }

      const result = await finalizeDebateOutline({
        prompt,
        outline,
        essayType,
        history,
      });
      return res.json(result);
    } catch (error) {
      const { status, message } = formatApiError(error);
      return res.status(status).json({ error: message });
    }
  });

  app.post('/api/debate/outline-3step', async (req, res) => {
    try {
      const prompt = String(req.body?.prompt ?? '').trim();
      const outline = String(req.body?.outline ?? '').trim();
      const essayType = req.body?.essayType ?? 'opinion';
      const stanceLabel = String(req.body?.stanceLabel ?? '').trim();
      const stanceDescription = String(req.body?.stanceDescription ?? '').trim();
      const riskWarning = String(req.body?.riskWarning ?? '').trim();

      if (prompt.length < 15) {
        return res.status(400).json({
          error: 'Vui lòng nhập đầy đủ đề bài trước khi lập dàn ý 3 bước.',
        });
      }
      if (!stanceLabel) {
        return res.status(400).json({
          error: 'Vui lòng chọn lập trường (stance) trước khi lập dàn ý.',
        });
      }

      const result = await generateThreeStepOutline({
        prompt,
        outline,
        essayType,
        stanceLabel,
        stanceDescription,
        riskWarning,
      });
      return res.json(result);
    } catch (error) {
      const { status, message } = formatApiError(error);
      return res.status(status).json({ error: message });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IELTS WITH FELIX server running on http://localhost:${PORT}`);
  });
}

startServer();
