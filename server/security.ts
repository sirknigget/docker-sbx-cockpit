import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { ZodError } from 'zod';
import type { Request, Response, NextFunction } from 'express';

export function localRequest(req: Request, res: Response, next: NextFunction) {
  const host = req.headers.host ?? '';

  if (!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host))
    return res
      .status(403)
      .json({ message: 'Use a loopback address to access Cockpit' });

  if (req.headers.origin && req.headers.origin !== `http://${host}`)
    return res
      .status(403)
      .json({ message: 'Cross-origin requests are blocked' });

  if (
    req.path.startsWith('/api') &&
    req.path !== '/api/health' &&
    req.headers['x-cockpit-request'] !== '1'
  )
    return res.status(403).json({ message: 'Missing Cockpit request header' });
  next();
}

@Catch(ZodError, SyntaxError)
export class ValidationFilter implements ExceptionFilter {
  catch(error: ZodError | SyntaxError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const message =
      error instanceof ZodError
        ? error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('; ')
        : 'Invalid JSON returned by sbx';

    response.status(400).json({ message });
  }
}

@Catch(HttpException)
export class HttpFilter implements ExceptionFilter {
  catch(error: HttpException, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(error.getStatus())
      .json({ message: error.message });
  }
}
