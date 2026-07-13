import type { APIRoute } from "astro";
import { site } from "../config/site";

export const prerender = true;

const routes = [
  "/",
  "/about",
  "/accessibility",
  "/contact",
  "/cookies",
  "/delete-account",
  "/how-it-works",
  "/privacy",
  "/reliability",
  "/safety",
  "/support",
  "/terms"
];

export const GET: APIRoute = () => {
  const urls = routes
    .map((route) => `  <url><loc>${new URL(route, site.origin).toString()}</loc></url>`)
    .join("\n");

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" }
  });
};
