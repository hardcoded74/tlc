import type { Metadata } from "next";
import "./globals.css";
import { DemoModeBanner } from "@/components/demo-mode-banner";

export const metadata: Metadata = {
  title: "TLC — Teacher's Lesson Creator",
  description:
    "Every teacher deserves TLC. A Gemma 4-powered lesson-building tool that turns a topic and grade level into a complete, classroom-ready lesson package.",
  openGraph: {
    title: "TLC — Teacher's Lesson Creator",
    description: "Gemma 4 + two Teacher's Assistants + a lesson package in minutes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <DemoModeBanner />
        {children}
      </body>
    </html>
  );
}
