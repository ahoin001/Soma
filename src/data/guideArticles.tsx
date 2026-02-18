/**
 * Health guide articles for the Guides > Articles tab.
 */
import type { ReactNode } from "react";
import { CalorieCarbCyclingArticleBody } from "@/components/aura/articles/CalorieCarbCyclingArticleBody";
import { FaceRoundnessArticleBody } from "@/components/aura/articles/FaceRoundnessArticleBody";
import { RecompArticleBody } from "@/components/aura/articles/RecompArticleBody";
import { SkinnyFatToLeanArticleBody } from "@/components/aura/articles/SkinnyFatToLeanArticleBody";
import { SodiumSharpFaceArticleBody } from "@/components/aura/articles/SodiumSharpFaceArticleBody";
import { SugarSharpFaceArticleBody } from "@/components/aura/articles/SugarSharpFaceArticleBody";

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
  {
    id: "calorie-carb-cycling",
    title: "Calorie & Carb Cycling for Skinny Fat",
    description:
      "Eat more on training days and less on rest days. Science of GLUT4 and insulin sensitivity, plus a calculator for your own training/rest targets.",
    category: "Fitness",
    body: <CalorieCarbCyclingArticleBody />,
  },
  {
    id: "sodium-sharp-face",
    title: "Sodium, Face Puffiness & the Sharp-Face Numbers",
    description:
      "Why sedentary lifters hold water in the face, FDA-backed sodium targets, the potassium see-saw, and calculators for a sharper jawline.",
    category: "Nutrition",
    body: <SodiumSharpFaceArticleBody />,
  },
  {
    id: "sugar-sharp-face",
    title: "Added Sugar, Sharp Face & Flat Gut",
    description:
      "AHA-backed added-sugar limits, why 25g helps recomp, insulin and glycogen water retention, and traps like protein bars and sauces.",
    category: "Nutrition",
    body: <SugarSharpFaceArticleBody />,
  },
];
