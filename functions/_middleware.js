export async function onRequest(context) {
  const url = new URL(context.request.url);

  // shuhan-10n.pages.dev へのアクセスをリダイレクト
  if (url.hostname === 'shuhan-10n.pages.dev') {
    return Response.redirect(`https://shuhan.rsasage.com${url.pathname}${url.search}`, 301);
  }

  return context.next();
}
