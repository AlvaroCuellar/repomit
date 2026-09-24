// Allow the documented 5 MB Excel upload plus multipart framing.
process.env.BODY_SIZE_LIMIT ||= '6M';
await import('../build/index.js');
