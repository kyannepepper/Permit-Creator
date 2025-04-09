import { ReactNode } from "react";
import Header from "./header";
import Sidebar from "./sidebar";
import MobileNav from "./mobile-nav";

type LayoutProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
};

export default function Layout({ children, title, subtitle }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6 pb-20 md:pb-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-neutral-dark">{title}</h2>
            {subtitle && <p className="text-neutral-medium">{subtitle}</p>}
          </div>
          
          {children}
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}
