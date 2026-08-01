import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SessionContent from "@/components/SessionContent";

export const metadata: Metadata = {
  title: "Session — SandShell",
};

export default function SessionPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <SessionContent />
      <Footer />
    </div>
  );
}
