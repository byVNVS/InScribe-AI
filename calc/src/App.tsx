import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import Home from "./screens/home/index.tsx";
import "./index.css";

const routes = [
  {
    path: "/",
    element: <Home />,
  },
];

export default function App() {
  return (
    <MantineProvider>
      <RouterProvider router={createBrowserRouter(routes)} />
    </MantineProvider>
  );
}
