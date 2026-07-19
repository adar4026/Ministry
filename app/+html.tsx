// Learn more https://docs.expo.dev/router/reference/static-rendering/#root-html

import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/*
          Supplements expo-router's own ScrollViewStyleReset (html/body/#root
          height:100%, body overflow:hidden) with the horizontal-overflow half
          of the same guarantee — belt-and-suspenders with the viewport meta
          above against horizontal drag/overscroll on iOS Safari/PWA
          (TASK_030 follow-up §12). `pan-y` keeps vertical scroll/wheel-picker
          drag and text selection working; it only rules out horizontal pan.
        */}
        <style
          id="ministry-no-horizontal-scroll"
          dangerouslySetInnerHTML={{
            __html: `html,body,#root{max-width:100%;overflow-x:hidden;overscroll-behavior-x:none;touch-action:pan-y}`,
          }}
        />

        {/* Add any additional <head> elements that you want globally available on web... */}
        <link rel="apple-touch-icon" href="/Ministry/apple-touch-icon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
