/**
 * Health guide articles for the Guides > Articles tab.
 */
import type { ReactNode } from "react";
import { FaceRoundnessArticleBody } from "@/components/aura/articles/FaceRoundnessArticleBody";
import { RecompArticleBody } from "@/components/aura/articles/RecompArticleBody";
import { SkinnyFatToLeanArticleBody } from "@/components/aura/articles/SkinnyFatToLeanArticleBody";

export type GuideArticle = {
  id: string;
  title: string;
  description: string;
  category?: string;
  body: ReactNode;
};

export const guideArticles: GuideArticle[] = [
  {
    id: "face-roundness-gameplan",
    title: "How to Reduce Face Roundness & Bloat: A Clear Game Plan",
    description:
      "Evidence-based strategies for a leaner-looking face—body fat, sodium, walking, and what actually moves the needle.",
    category: "Nutrition",
    body: <FaceRoundnessArticleBody />,
  },
  {
    id: "skinny-fat-to-lean",
    title: "From Skinny Fat to Lean: Science-Based Guide",
    description:
      "Types of skinny fat, what research says about building muscle and losing fat, and realistic approaches so you know what to expect.",
    category: "Fitness",
    body: <SkinnyFatToLeanArticleBody />,
  },
  {
    id: "recomp-guide",
    title: "Body Recomp: One-Stop Guide for Skinny Fat",
    description:
      "Pros and cons, best practices, and a personalized calculator so you know exactly how to approach recomp—maintenance calories, protein, and training.",
    category: "Fitness",
    body: <RecompArticleBody />,
  },
];
