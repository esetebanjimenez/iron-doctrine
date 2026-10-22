import { createFileRoute } from "@tanstack/react-router";
import { Battle } from "@/game/view/Battle";

export const Route = createFileRoute("/")({ component: Battle });
