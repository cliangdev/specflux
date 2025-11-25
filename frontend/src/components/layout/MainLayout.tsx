import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import { ThemeProvider } from "../../contexts";

export default function MainLayout() {
  return (
    <ThemeProvider>
      <div className="h-screen bg-system-50 dark:bg-system-950 text-system-900 dark:text-system-100 flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 h-full overflow-auto p-6 scrollbar-thin">
            <Outlet />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
