import { redirect } from "next/navigation";

/** The app lives under the (app) route group; `/` just enters the shell. */
export default function HomePage() {
  redirect("/dashboard");
}
