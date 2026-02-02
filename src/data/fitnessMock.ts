import type { WorkoutPlan } from "@/types/fitness";

export const workoutPlans: WorkoutPlan[] = [
  {
    id: "plan-ppl",
    name: "Nippard Transformation",
    workouts: [
      {
        id: "ppl-upper",
        name: "Upper",
        lastPerformed: "8 days ago",
        exercises: [
          { id: "ppl-upper-1", name: "Incline Bench Press (Dumbbell)" },
          { id: "ppl-upper-2", name: "Pec Deck (Machine)" },
          { id: "ppl-upper-3", name: "Lat Pulldown (Cable)" },
          { id: "ppl-upper-4", name: "Seated Row (Cable)" },
        ],
      },
      {
        id: "ppl-lower",
        name: "Lower",
        lastPerformed: "Oct 21, 2025",
        exercises: [
          { id: "ppl-lower-1", name: "Lying Leg Curl (Machine)" },
          { id: "ppl-lower-2", name: "Squat (Smith Machine)" },
          { id: "ppl-lower-3", name: "Romanian Deadlift (Barbell)" },
          { id: "ppl-lower-4", name: "Leg Press" },
        ],
      },
      {
        id: "ppl-pull",
        name: "Pull",
        lastPerformed: "3 days ago",
        exercises: [
          { id: "ppl-pull-1", name: "Lat Pulldown (Cable)" },
          { id: "ppl-pull-2", name: "Incline Row (Dumbbell)" },
          { id: "ppl-pull-3", name: "Seated Row (Cable)" },
          { id: "ppl-pull-4", name: "Reverse Fly (Cable)" },
        ],
      },
      {
        id: "ppl-push",
        name: "Push",
        lastPerformed: "4 days ago",
        exercises: [
          { id: "ppl-push-1", name: "Chest Press (Machine)" },
          { id: "ppl-push-2", name: "Shoulder Press (Machine)" },
          { id: "ppl-push-3", name: "Chest Fly (Cable)" },
          { id: "ppl-push-4", name: "Lateral Raise (Cable)" },
        ],
      },
      {
        id: "ppl-leg",
        name: "Leg",
        lastPerformed: "Oct 16, 2025",
        exercises: [
          { id: "ppl-leg-1", name: "Leg Press" },
          { id: "ppl-leg-2", name: "Lying Leg Curl (Machine)" },
          { id: "ppl-leg-3", name: "Bulgarian Split Squat" },
          { id: "ppl-leg-4", name: "Leg Extension (Machine)" },
        ],
      },
    ],
  },
  {
    id: "plan-2025",
    name: "2025 Plan",
    workouts: [
      {
        id: "2025-upper",
        name: "Upper Strength",
        lastPerformed: "Oct 02, 2025",
        exercises: [
          { id: "2025-upper-1", name: "Bench Press" },
          { id: "2025-upper-2", name: "Pull Up" },
          { id: "2025-upper-3", name: "Row" },
          { id: "2025-upper-4", name: "Shoulder Press" },
        ],
      },
      {
        id: "2025-lower",
        name: "Lower Strength",
        lastPerformed: "Sep 28, 2025",
        exercises: [
          { id: "2025-lower-1", name: "Back Squat" },
          { id: "2025-lower-2", name: "Deadlift" },
          { id: "2025-lower-3", name: "Walking Lunge" },
        ],
      },
      {
        id: "2025-core",
        name: "Core & Carry",
        lastPerformed: "Sep 21, 2025",
        exercises: [
          { id: "2025-core-1", name: "Plank" },
          { id: "2025-core-2", name: "Pallof Press" },
          { id: "2025-core-3", name: "Farmer Carry" },
        ],
      },
      {
        id: "2025-mobility",
        name: "Mobility Reset",
        lastPerformed: "Sep 20, 2025",
        exercises: [
          { id: "2025-mobility-1", name: "Hip Flow" },
          { id: "2025-mobility-2", name: "T-Spine Openers" },
          { id: "2025-mobility-3", name: "Breathing" },
        ],
      },
      {
        id: "2025-conditioning",
        name: "Conditioning",
        lastPerformed: "Sep 18, 2025",
        exercises: [
          { id: "2025-conditioning-1", name: "Air Bike" },
          { id: "2025-conditioning-2", name: "Sled Push" },
          { id: "2025-conditioning-3", name: "Row Erg" },
        ],
      },
    ],
  },
  {
    id: "plan-ultimate",
    name: "Nippard Ultimate PPL",
    workouts: [
      {
        id: "ultimate-push",
        name: "Push A",
        lastPerformed: "Sep 10, 2025",
        exercises: [
          { id: "ultimate-push-1", name: "Incline Press" },
          { id: "ultimate-push-2", name: "Machine Press" },
          { id: "ultimate-push-3", name: "Cable Fly" },
        ],
      },
      {
        id: "ultimate-pull",
        name: "Pull A",
        lastPerformed: "Sep 08, 2025",
        exercises: [
          { id: "ultimate-pull-1", name: "Lat Pulldown" },
          { id: "ultimate-pull-2", name: "Chest Supported Row" },
          { id: "ultimate-pull-3", name: "Face Pull" },
        ],
      },
      {
        id: "ultimate-leg",
        name: "Leg A",
        lastPerformed: "Sep 05, 2025",
        exercises: [
          { id: "ultimate-leg-1", name: "Hack Squat" },
          { id: "ultimate-leg-2", name: "Leg Curl" },
          { id: "ultimate-leg-3", name: "Calf Raise" },
        ],
      },
      {
        id: "ultimate-push-b",
        name: "Push B",
        lastPerformed: "Sep 03, 2025",
        exercises: [
          { id: "ultimate-push-b-1", name: "Flat Press" },
          { id: "ultimate-push-b-2", name: "DB Shoulder Press" },
          { id: "ultimate-push-b-3", name: "Triceps Rope" },
        ],
      },
      {
        id: "ultimate-pull-b",
        name: "Pull B",
        lastPerformed: "Sep 01, 2025",
        exercises: [
          { id: "ultimate-pull-b-1", name: "Pull Up" },
          { id: "ultimate-pull-b-2", name: "Single Arm Row" },
          { id: "ultimate-pull-b-3", name: "Rear Delt Fly" },
        ],
      },
      {
        id: "ultimate-leg-b",
        name: "Leg B",
        lastPerformed: "Aug 29, 2025",
        exercises: [
          { id: "ultimate-leg-b-1", name: "Front Squat" },
          { id: "ultimate-leg-b-2", name: "RDL" },
          { id: "ultimate-leg-b-3", name: "Hip Thrust" },
        ],
      },
    ],
  },
];
