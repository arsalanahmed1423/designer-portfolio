import type { Metadata } from "next";
import localFont from "next/font/local";
import CursorGlow from "@/components/CursorGlow";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const satoshi = localFont({
  src: [
    {
      path: "./fonts/Satoshi-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/Satoshi-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Satoshi-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/Satoshi-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/Satoshi-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Syed Saqib Abbas — UX Designer",
  description:
    "UX designer working across design, execution, and AI workflows.",
};

const headInitScript = `
(() => {
  try {
    const theme = localStorage.getItem("theme");
    document.documentElement.dataset.theme =
      theme === "light" || theme === "dark" ? theme : "dark";
  } catch {
    document.documentElement.dataset.theme = "dark";
  }

  try {
    const clean = (el) => {
      if (el && el.removeAttribute) {
        if (el.hasAttribute("bis_skin_checked")) el.removeAttribute("bis_skin_checked");
        if (el.hasAttribute("bis_register")) el.removeAttribute("bis_register");
      }
    };
    const observer = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.type === "attributes") {
          if (m.attributeName === "bis_skin_checked" || m.attributeName === "bis_register") {
            m.target.removeAttribute(m.attributeName);
          }
        } else if (m.type === "childList") {
          for (let j = 0; j < m.addedNodes.length; j++) {
            const n = m.addedNodes[j];
            if (n.nodeType === 1) {
              clean(n);
              const list = n.querySelectorAll?.("[bis_skin_checked], [bis_register]");
              if (list) for (let k = 0; k < list.length; k++) clean(list[k]);
            }
          }
        }
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      subtree: true,
      childList: true,
      attributeFilter: ["bis_skin_checked", "bis_register"],
    });
  } catch {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${satoshi.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: headInitScript }} />
      </head>
      <body
        className="relative flex min-h-full flex-col font-sans"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <CursorGlow />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
