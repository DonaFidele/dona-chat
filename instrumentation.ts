export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerOTel } = await import('@vercel/otel');
    const { LangfuseExporter } = await import('langfuse-vercel');

    registerOTel({
      serviceName: 'ai-chatbot',
      traceExporter: new LangfuseExporter(),
    });
  }
}
