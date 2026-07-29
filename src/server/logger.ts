import { context, trace } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';
import pino from 'pino';

const createLogger = () => {
  if (typeof window !== 'undefined') {
    return null;
  }

  try {
    const nodeRequire = eval('require') as (id: string) => unknown;
    const pretty = nodeRequire('pino-pretty') as (opts: {
      colorize: boolean;
      messageFormat: string;
      translateTime: string;
    }) => unknown;

    const stream = pretty({
      colorize: true,
      messageFormat: '{msg} [trace_id={trace_id}, span_id={span_id}]',
      translateTime: 'yyyy-mm-dd HH:MM:ss.l o',
    });

    return pino(stream as never);
  } catch {
    return pino({ timestamp: pino.stdTimeFunctions.isoTime });
  }
};

const logger = createLogger();

const otelLogger = logs.getLogger('otel-pino-logger');

export const getCurrentTraceIds = () => {
  const span = trace.getSpan(context.active());
  return {
    trace_id: span?.spanContext().traceId ?? 'no-trace',
    span_id: span?.spanContext().spanId ?? 'no-span',
  };
};

export const errorObjLog = (error: unknown, message: string, data?: Record<string, unknown>) => {
  const traceIds = getCurrentTraceIds();

  const hasData = Boolean(data);
  const isErrorInstance = error instanceof Error;
  const inferredData =
    !hasData && error && typeof error === 'object' && !isErrorInstance ? (error as Record<string, unknown>) : undefined;
  const payloadData = data ?? inferredData;
  const statusCode =
    typeof payloadData?.statusCode === 'number'
      ? payloadData.statusCode
      : typeof payloadData?.status === 'number'
        ? payloadData.status
        : undefined;

  const errorMessage = isErrorInstance ? error.message : ((error as { message?: string })?.message ?? 'Unknown error');

  otelLogger.emit({
    body: message,
    ...traceIds,
    ...(statusCode !== undefined ? { status_code: statusCode } : {}),
    ...(payloadData ? { data: payloadData } : {}),
  });

  logger?.error(
    {
      ...traceIds,
      ...(statusCode !== undefined ? { status_code: statusCode } : {}),
      error: {
        message: errorMessage,
      },
      ...(payloadData ? { data: payloadData } : {}),
    },
    message,
  );
  if (!logger) {
    console.error(new Date().toISOString(), message, {
      ...traceIds,
      ...(statusCode !== undefined ? { status_code: statusCode } : {}),
    });
  }
};
export const errorLog = (message: string) => {
  const traceIds = getCurrentTraceIds();

  otelLogger.emit({ body: message, ...traceIds });
  logger?.error({ ...traceIds }, message);
  if (!logger) {
    console.error(new Date().toISOString(), message, traceIds);
  }
};

export const warnLog = (message: string) => {
  const traceIds = getCurrentTraceIds();

  otelLogger.emit({ body: message, ...traceIds });
  logger?.warn({ ...traceIds }, message);
  if (!logger) {
    console.warn(new Date().toISOString(), message, traceIds);
  }
};

export const infoLog = (message: string) => {
  const traceIds = getCurrentTraceIds();

  otelLogger.emit({ body: message, ...traceIds });
  logger?.info({ ...traceIds }, message);
  if (!logger) {
    console.info(new Date().toISOString(), message, traceIds);
  }
};
