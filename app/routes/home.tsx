import Welcome from "~/welcome/welcome";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "NOWRK" },
    { name: "description", content: "NOWRK, Berlin" },
  ];
}

export default function Home() {
  return <Welcome />;
}
