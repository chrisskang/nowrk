import Welcome from "~/welcome/welcome";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Chris Kang" }, { name: "description", content: "NOWRK" }];
}

export default function Home() {
  return <Welcome />;
}
