export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      body_measurements: {
        Row: {
          created_at: string
          id: string
          logged_at: string
          measurement_type: Database["public"]["Enums"]["journal_measurement_type"]
          notes: string | null
          unit: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          logged_at?: string
          measurement_type: Database["public"]["Enums"]["journal_measurement_type"]
          notes?: string | null
          unit?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          logged_at?: string
          measurement_type?: Database["public"]["Enums"]["journal_measurement_type"]
          notes?: string | null
          unit?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "body_measurements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          id: string
          is_verified: boolean
          logo_url: string | null
          name: string
          normalized_name: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_verified?: boolean
          logo_url?: string | null
          name: string
          normalized_name?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_verified?: boolean
          logo_url?: string | null
          name?: string
          normalized_name?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_nutrition_summary: {
        Row: {
          burned_kcal: number
          carbs_g: number
          eaten_kcal: number
          fat_g: number
          local_date: string
          protein_g: number
          updated_at: string
          user_id: string
        }
        Insert: {
          burned_kcal?: number
          carbs_g?: number
          eaten_kcal?: number
          fat_g?: number
          local_date: string
          protein_g?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          burned_kcal?: number
          carbs_g?: number
          eaten_kcal?: number
          fat_g?: number
          local_date?: string
          protein_g?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_nutrition_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_nutrition_targets: {
        Row: {
          carbs_g: number | null
          fat_g: number | null
          kcal_goal: number | null
          local_date: string
          protein_g: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs_g?: number | null
          fat_g?: number | null
          kcal_goal?: number | null
          local_date: string
          protein_g?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          carbs_g?: number | null
          fat_g?: number | null
          kcal_goal?: number | null
          local_date?: string
          protein_g?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_nutrition_targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_media: {
        Row: {
          created_at: string
          exercise_id: number | null
          exercise_name: string
          id: string
          is_primary: boolean
          media_url: string
          source_type: string
          thumb_url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          exercise_id?: number | null
          exercise_name: string
          id?: string
          is_primary?: boolean
          media_url: string
          source_type: string
          thumb_url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          exercise_id?: number | null
          exercise_name?: string
          id?: string
          is_primary?: boolean
          media_url?: string
          source_type?: string
          thumb_url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_media_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_overrides: {
        Row: {
          exercise_id: number | null
          exercise_name: string
          guide_url: string | null
          id: string
          steps: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          exercise_id?: number | null
          exercise_name: string
          guide_url?: string | null
          id?: string
          steps?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          exercise_id?: number | null
          exercise_name?: string
          guide_url?: string | null
          id?: string
          steps?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_overrides_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_stats_daily: {
        Row: {
          day: string
          est_one_rm_kg: number | null
          exercise_id: number
          max_weight_kg: number | null
          total_reps: number
          total_sets: number
          total_volume_kg: number
          updated_at: string
          user_id: string
        }
        Insert: {
          day: string
          est_one_rm_kg?: number | null
          exercise_id: number
          max_weight_kg?: number | null
          total_reps?: number
          total_sets?: number
          total_volume_kg?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          day?: string
          est_one_rm_kg?: number | null
          exercise_id?: number
          max_weight_kg?: number | null
          total_reps?: number
          total_sets?: number
          total_volume_kg?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_stats_daily_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_stats_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          equipment: string[] | null
          id: number
          image_url: string | null
          is_custom: boolean
          muscles: string[] | null
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          equipment?: string[] | null
          id?: number
          image_url?: string | null
          is_custom?: boolean
          muscles?: string[] | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          equipment?: string[] | null
          id?: number
          image_url?: string | null
          is_custom?: boolean
          muscles?: string[] | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      food_nutrients: {
        Row: {
          amount: number
          food_id: string
          nutrient_key: string
          unit: string | null
        }
        Insert: {
          amount?: number
          food_id: string
          nutrient_key: string
          unit?: string | null
        }
        Update: {
          amount?: number
          food_id?: string
          nutrient_key?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_nutrients_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      food_servings: {
        Row: {
          food_id: string
          grams: number
          id: string
          label: string
        }
        Insert: {
          food_id: string
          grams: number
          id?: string
          label: string
        }
        Update: {
          food_id?: string
          grams?: number
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_servings_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          added_sugar_g: number | null
          barcode: string | null
          brand: string | null
          brand_id: string | null
          calcium_mg: number | null
          carbs_g: number
          cholesterol_mg: number | null
          created_at: string
          created_by_user_id: string | null
          fat_g: number
          fiber_g: number | null
          folate_mcg: number | null
          id: string
          image_url: string | null
          iron_mg: number | null
          is_global: boolean
          kcal: number
          magnesium_mg: number | null
          micronutrients: Json
          name: string
          normalized_name: string | null
          omega3_g: number | null
          omega6_g: number | null
          parent_food_id: string | null
          potassium_mg: number | null
          portion_grams: number | null
          portion_label: string | null
          protein_g: number
          saturated_fat_g: number | null
          search_vector: unknown
          sodium_mg: number | null
          source: string | null
          sugar_g: number | null
          trans_fat_g: number | null
          updated_at: string
          vitamin_a_mcg: number | null
          vitamin_b12_mcg: number | null
          vitamin_c_mg: number | null
          vitamin_d_mcg: number | null
          zinc_mg: number | null
        }
        Insert: {
          added_sugar_g?: number | null
          barcode?: string | null
          brand?: string | null
          brand_id?: string | null
          calcium_mg?: number | null
          carbs_g?: number
          cholesterol_mg?: number | null
          created_at?: string
          created_by_user_id?: string | null
          fat_g?: number
          fiber_g?: number | null
          folate_mcg?: number | null
          id?: string
          image_url?: string | null
          iron_mg?: number | null
          is_global?: boolean
          kcal?: number
          magnesium_mg?: number | null
          micronutrients?: Json
          name: string
          normalized_name?: string | null
          omega3_g?: number | null
          omega6_g?: number | null
          parent_food_id?: string | null
          potassium_mg?: number | null
          portion_grams?: number | null
          portion_label?: string | null
          protein_g?: number
          saturated_fat_g?: number | null
          search_vector?: unknown
          sodium_mg?: number | null
          source?: string | null
          sugar_g?: number | null
          trans_fat_g?: number | null
          updated_at?: string
          vitamin_a_mcg?: number | null
          vitamin_b12_mcg?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_mcg?: number | null
          zinc_mg?: number | null
        }
        Update: {
          added_sugar_g?: number | null
          barcode?: string | null
          brand?: string | null
          brand_id?: string | null
          calcium_mg?: number | null
          carbs_g?: number
          cholesterol_mg?: number | null
          created_at?: string
          created_by_user_id?: string | null
          fat_g?: number
          fiber_g?: number | null
          folate_mcg?: number | null
          id?: string
          image_url?: string | null
          iron_mg?: number | null
          is_global?: boolean
          kcal?: number
          magnesium_mg?: number | null
          micronutrients?: Json
          name?: string
          normalized_name?: string | null
          omega3_g?: number | null
          omega6_g?: number | null
          parent_food_id?: string | null
          potassium_mg?: number | null
          portion_grams?: number | null
          portion_label?: string | null
          protein_g?: number
          saturated_fat_g?: number | null
          search_vector?: unknown
          sodium_mg?: number | null
          source?: string | null
          sugar_g?: number | null
          trans_fat_g?: number | null
          updated_at?: string
          vitamin_a_mcg?: number | null
          vitamin_b12_mcg?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_mcg?: number | null
          zinc_mg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "foods_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foods_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foods_parent_food_id_fkey"
            columns: ["parent_food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_bag_items: {
        Row: {
          bucket: string
          category: string | null
          created_at: string
          id: string
          macro_group: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bucket: string
          category?: string | null
          created_at?: string
          id?: string
          macro_group?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bucket?: string
          category?: string | null
          created_at?: string
          id?: string
          macro_group?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_bag_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_entries: {
        Row: {
          id: string
          local_date: string
          logged_at: string
          meal_type_id: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          id?: string
          local_date: string
          logged_at?: string
          meal_type_id?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          id?: string
          local_date?: string
          logged_at?: string
          meal_type_id?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_entries_meal_type_id_fkey"
            columns: ["meal_type_id"]
            isOneToOne: false
            referencedRelation: "meal_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_entry_items: {
        Row: {
          added_sugar_g: number | null
          calcium_mg: number | null
          carbs_g: number
          cholesterol_mg: number | null
          created_at: string
          fat_g: number
          fiber_g: number | null
          food_id: string | null
          food_name: string
          folate_mcg: number | null
          id: string
          iron_mg: number | null
          kcal: number
          magnesium_mg: number | null
          meal_entry_id: string
          micronutrients: Json
          omega3_g: number | null
          omega6_g: number | null
          potassium_mg: number | null
          portion_grams: number | null
          portion_label: string | null
          protein_g: number
          saturated_fat_g: number | null
          sodium_mg: number | null
          sugar_g: number | null
          quantity: number
          sort_order: number
          trans_fat_g: number | null
          vitamin_a_mcg: number | null
          vitamin_b12_mcg: number | null
          vitamin_c_mg: number | null
          vitamin_d_mcg: number | null
          zinc_mg: number | null
        }
        Insert: {
          added_sugar_g?: number | null
          calcium_mg?: number | null
          carbs_g?: number
          cholesterol_mg?: number | null
          created_at?: string
          fat_g?: number
          fiber_g?: number | null
          food_id?: string | null
          food_name: string
          folate_mcg?: number | null
          id?: string
          iron_mg?: number | null
          kcal?: number
          magnesium_mg?: number | null
          meal_entry_id: string
          micronutrients?: Json
          omega3_g?: number | null
          omega6_g?: number | null
          potassium_mg?: number | null
          portion_grams?: number | null
          portion_label?: string | null
          protein_g?: number
          saturated_fat_g?: number | null
          sodium_mg?: number | null
          sugar_g?: number | null
          quantity?: number
          sort_order?: number
          trans_fat_g?: number | null
          vitamin_a_mcg?: number | null
          vitamin_b12_mcg?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_mcg?: number | null
          zinc_mg?: number | null
        }
        Update: {
          added_sugar_g?: number | null
          calcium_mg?: number | null
          carbs_g?: number
          cholesterol_mg?: number | null
          created_at?: string
          fat_g?: number
          fiber_g?: number | null
          food_id?: string | null
          food_name?: string
          folate_mcg?: number | null
          id?: string
          iron_mg?: number | null
          kcal?: number
          magnesium_mg?: number | null
          meal_entry_id?: string
          micronutrients?: Json
          omega3_g?: number | null
          omega6_g?: number | null
          potassium_mg?: number | null
          portion_grams?: number | null
          portion_label?: string | null
          protein_g?: number
          saturated_fat_g?: number | null
          sodium_mg?: number | null
          sugar_g?: number | null
          quantity?: number
          sort_order?: number
          trans_fat_g?: number | null
          vitamin_a_mcg?: number | null
          vitamin_b12_mcg?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_mcg?: number | null
          zinc_mg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_entry_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_entry_items_meal_entry_id_fkey"
            columns: ["meal_entry_id"]
            isOneToOne: false
            referencedRelation: "meal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_days: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          name: string
          target_carbs_g: number
          target_fat_g: number
          target_kcal: number
          target_protein_g: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          name: string
          target_carbs_g?: number
          target_fat_g?: number
          target_kcal?: number
          target_protein_g?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          name?: string
          target_carbs_g?: number
          target_fat_g?: number
          target_kcal?: number
          target_protein_g?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_days_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_days_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_items: {
        Row: {
          carbs_g: number
          created_at: string
          fat_g: number
          food_id: string | null
          food_name: string
          id: string
          kcal: number
          meal_id: string
          protein_g: number
          quantity: number
          slot: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          food_id?: string | null
          food_name: string
          id?: string
          kcal?: number
          meal_id: string
          protein_g?: number
          quantity?: number
          slot?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          food_id?: string | null
          food_name?: string
          id?: string
          kcal?: number
          meal_id?: string
          protein_g?: number
          quantity?: number
          slot?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_meals"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_meals: {
        Row: {
          created_at: string
          day_id: string
          emoji: string | null
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_id: string
          emoji?: string | null
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_id?: string
          emoji?: string | null
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_meals_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_target_presets: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          target_carbs_g: number
          target_carbs_g_max: number | null
          target_carbs_g_min: number | null
          target_fat_g: number
          target_fat_g_max: number | null
          target_fat_g_min: number | null
          target_kcal: number
          target_kcal_max: number | null
          target_kcal_min: number | null
          target_protein_g: number
          target_protein_g_max: number | null
          target_protein_g_min: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          target_carbs_g?: number
          target_carbs_g_max?: number | null
          target_carbs_g_min?: number | null
          target_fat_g?: number
          target_fat_g_max?: number | null
          target_fat_g_min?: number | null
          target_kcal?: number
          target_kcal_max?: number | null
          target_kcal_min?: number | null
          target_protein_g?: number
          target_protein_g_max?: number | null
          target_protein_g_min?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          target_carbs_g?: number
          target_carbs_g_max?: number | null
          target_carbs_g_min?: number | null
          target_fat_g?: number
          target_fat_g_max?: number | null
          target_fat_g_min?: number | null
          target_kcal?: number
          target_kcal_max?: number | null
          target_kcal_min?: number | null
          target_protein_g?: number
          target_protein_g_max?: number | null
          target_protein_g_min?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_target_presets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_week_assignments: {
        Row: {
          day_id: string | null
          updated_at: string
          user_id: string
          weekday: number
        }
        Insert: {
          day_id?: string | null
          updated_at?: string
          user_id: string
          weekday: number
        }
        Update: {
          day_id?: string | null
          updated_at?: string
          user_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_week_assignments_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_week_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_types: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          label: string
          sort_order: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          label: string
          sort_order?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          label?: string
          sort_order?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_types_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      muscle_stats_daily: {
        Row: {
          day: string
          muscle: string
          total_sets: number
          total_volume_kg: number
          updated_at: string
          user_id: string
        }
        Insert: {
          day: string
          muscle: string
          total_sets?: number
          total_volume_kg?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          day?: string
          muscle?: string
          total_sets?: number
          total_volume_kg?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "muscle_stats_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_photos: {
        Row: {
          created_at: string
          id: string
          image_url: string
          note: string | null
          taken_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          note?: string | null
          taken_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          note?: string | null
          taken_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_exercises: {
        Row: {
          exercise_id: number | null
          exercise_name: string
          group_id: string | null
          group_order: number
          group_type: Database["public"]["Enums"]["exercise_group_type"]
          id: string
          item_order: number
          notes: string | null
          routine_id: string
          target_sets: number
        }
        Insert: {
          exercise_id?: number | null
          exercise_name: string
          group_id?: string | null
          group_order?: number
          group_type?: Database["public"]["Enums"]["exercise_group_type"]
          id?: string
          item_order: number
          notes?: string | null
          routine_id: string
          target_sets?: number
        }
        Update: {
          exercise_id?: number | null
          exercise_name?: string
          group_id?: string | null
          group_order?: number
          group_type?: Database["public"]["Enums"]["exercise_group_type"]
          id?: string
          item_order?: number
          notes?: string | null
          routine_id?: string
          target_sets?: number
        }
        Relationships: [
          {
            foreignKeyName: "routine_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_exercises_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          applied_at: string
          filename: string
        }
        Insert: {
          applied_at?: string
          filename: string
        }
        Update: {
          applied_at?: string
          filename?: string
        }
        Relationships: []
      }
      session_exercises: {
        Row: {
          exercise_id: number | null
          exercise_name: string
          group_id: string | null
          group_order: number
          group_type: Database["public"]["Enums"]["exercise_group_type"]
          id: string
          item_order: number
          session_id: string
        }
        Insert: {
          exercise_id?: number | null
          exercise_name: string
          group_id?: string | null
          group_order?: number
          group_type?: Database["public"]["Enums"]["exercise_group_type"]
          id?: string
          item_order: number
          session_id: string
        }
        Update: {
          exercise_id?: number | null
          exercise_name?: string
          group_id?: string | null
          group_order?: number
          group_type?: Database["public"]["Enums"]["exercise_group_type"]
          id?: string
          item_order?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_sets: {
        Row: {
          completed_at: string
          id: string
          notes: string | null
          reps: number | null
          rest_seconds: number | null
          rir: number | null
          rpe: number | null
          session_exercise_id: string
          unit_used: string | null
          weight: number | null
          weight_display: number | null
          weight_kg: number | null
        }
        Insert: {
          completed_at?: string
          id?: string
          notes?: string | null
          reps?: number | null
          rest_seconds?: number | null
          rir?: number | null
          rpe?: number | null
          session_exercise_id: string
          unit_used?: string | null
          weight?: number | null
          weight_display?: number | null
          weight_kg?: number | null
        }
        Update: {
          completed_at?: string
          id?: string
          notes?: string | null
          reps?: number | null
          rest_seconds?: number | null
          rir?: number | null
          rpe?: number | null
          session_exercise_id?: string
          unit_used?: string | null
          weight?: number | null
          weight_display?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_sets_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      session_summary: {
        Row: {
          duration_sec: number | null
          session_id: string
          total_sets: number | null
          total_volume: number | null
          updated_at: string
        }
        Insert: {
          duration_sec?: number | null
          session_id: string
          total_sets?: number | null
          total_volume?: number | null
          updated_at?: string
        }
        Update: {
          duration_sec?: number | null
          session_id?: string
          total_sets?: number | null
          total_volume?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_summary_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      steps_logs: {
        Row: {
          id: string
          local_date: string
          logged_at: string
          source: string | null
          steps: number
          user_id: string
        }
        Insert: {
          id?: string
          local_date: string
          logged_at?: string
          source?: string | null
          steps: number
          user_id: string
        }
        Update: {
          id?: string
          local_date?: string
          logged_at?: string
          source?: string | null
          steps?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "steps_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_goals: {
        Row: {
          steps_goal: number | null
          updated_at: string
          user_id: string
          water_goal_ml: number | null
          weight_unit: string | null
        }
        Insert: {
          steps_goal?: number | null
          updated_at?: string
          user_id: string
          water_goal_ml?: number | null
          weight_unit?: string | null
        }
        Update: {
          steps_goal?: number | null
          updated_at?: string
          user_id?: string
          water_goal_ml?: number | null
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_food_favorites: {
        Row: {
          created_at: string
          food_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          food_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          food_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_food_favorites_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_food_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_food_history: {
        Row: {
          food_id: string
          last_logged_at: string
          times_logged: number
          user_id: string
        }
        Insert: {
          food_id: string
          last_logged_at?: string
          times_logged?: number
          user_id: string
        }
        Update: {
          food_id?: string
          last_logged_at?: string
          times_logged?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_food_history_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_food_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_food_overrides: {
        Row: {
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          food_id: string
          id: string
          kcal: number | null
          micronutrients: Json
          portion_grams: number | null
          portion_label: string | null
          protein_g: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          food_id: string
          id?: string
          kcal?: number | null
          micronutrients?: Json
          portion_grams?: number | null
          portion_label?: string | null
          protein_g?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          food_id?: string
          id?: string
          kcal?: number | null
          micronutrients?: Json
          portion_grams?: number | null
          portion_label?: string | null
          protein_g?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_food_overrides_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_food_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_nutrition_settings: {
        Row: {
          carbs_g: number | null
          fat_g: number | null
          kcal_goal: number | null
          protein_g: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs_g?: number | null
          fat_g?: number | null
          kcal_goal?: number | null
          protein_g?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          carbs_g?: number | null
          fat_g?: number | null
          kcal_goal?: number | null
          protein_g?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_nutrition_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          notifications: Json | null
          privacy: Json | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          notifications?: Json | null
          privacy?: Json | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          notifications?: Json | null
          privacy?: Json | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string
          dob: string | null
          height_cm: number | null
          sex: string | null
          timezone: string | null
          units: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          dob?: string | null
          height_cm?: number | null
          sex?: string | null
          timezone?: string | null
          units?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          dob?: string | null
          height_cm?: number | null
          sex?: string | null
          timezone?: string | null
          units?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_provider: string | null
          auth_subject: string | null
          created_at: string
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          auth_provider?: string | null
          auth_subject?: string | null
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          auth_provider?: string | null
          auth_subject?: string | null
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          amount_ml: number
          id: string
          local_date: string
          logged_at: string
          source: string | null
          user_id: string
        }
        Insert: {
          amount_ml: number
          id?: string
          local_date: string
          logged_at?: string
          source?: string | null
          user_id: string
        }
        Update: {
          amount_ml?: number
          id?: string
          local_date?: string
          logged_at?: string
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "water_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_logs: {
        Row: {
          id: string
          local_date: string
          logged_at: string
          notes: string | null
          unit: string
          user_id: string
          weight: number
        }
        Insert: {
          id?: string
          local_date: string
          logged_at?: string
          notes?: string | null
          unit?: string
          user_id: string
          weight: number
        }
        Update: {
          id?: string
          local_date?: string
          logged_at?: string
          notes?: string | null
          unit?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "weight_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          notes: string | null
          routine_id: string | null
          started_at: string
          template_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          routine_id?: string | null
          started_at?: string
          template_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          routine_id?: string | null
          started_at?: string
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_template_exercise_alternates: {
        Row: {
          alternate_exercise_id: number
          created_at: string
          sort_order: number
          template_exercise_id: string
        }
        Insert: {
          alternate_exercise_id: number
          created_at?: string
          sort_order?: number
          template_exercise_id: string
        }
        Update: {
          alternate_exercise_id?: number
          created_at?: string
          sort_order?: number
          template_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_exercise_alternates_alternate_exercise_id_fkey"
            columns: ["alternate_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_exercise_alternates_template_exercise_id_fkey"
            columns: ["template_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_template_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_template_exercises: {
        Row: {
          exercise_id: number | null
          exercise_name: string
          group_id: string | null
          group_order: number
          group_type: Database["public"]["Enums"]["exercise_group_type"]
          id: string
          item_order: number
          notes: string | null
          target_sets: number
          template_id: string
        }
        Insert: {
          exercise_id?: number | null
          exercise_name: string
          group_id?: string | null
          group_order?: number
          group_type?: Database["public"]["Enums"]["exercise_group_type"]
          id?: string
          item_order: number
          notes?: string | null
          target_sets?: number
          template_id: string
        }
        Update: {
          exercise_id?: number | null
          exercise_name?: string
          group_id?: string | null
          group_order?: number
          group_type?: Database["public"]["Enums"]["exercise_group_type"]
          id?: string
          item_order?: number
          notes?: string | null
          target_sets?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_exercises_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          last_performed_at: string | null
          name: string
          plan_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_performed_at?: string | null
          name: string
          plan_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_performed_at?: string | null
          name?: string
          plan_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_templates_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_latest_measurements: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          logged_at: string
          measurement_type: string
          unit: string
          value: number
        }[]
      }
      nutrition_analytics: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          carbs_g: number
          day: string
          fat_g: number
          kcal: number
          protein_g: number
        }[]
      }
      nutrition_streak: {
        Args: { p_user_id: string }
        Returns: {
          best_streak: number
          current_streak: number
        }[]
      }
      nutrition_weekly: {
        Args: { p_start: string; p_user_id: string }
        Returns: {
          day: string
          kcal: number
        }[]
      }
    }
    Enums: {
      exercise_group_type: "straight_set" | "superset" | "circuit" | "giant_set"
      journal_measurement_type:
        | "body_weight"
        | "neck"
        | "shoulders"
        | "chest"
        | "left_bicep"
        | "right_bicep"
        | "left_forearm"
        | "right_forearm"
        | "waist"
        | "hips"
        | "left_thigh"
        | "right_thigh"
        | "left_calf"
        | "right_calf"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      exercise_group_type: ["straight_set", "superset", "circuit", "giant_set"],
      journal_measurement_type: [
        "body_weight",
        "neck",
        "shoulders",
        "chest",
        "left_bicep",
        "right_bicep",
        "left_forearm",
        "right_forearm",
        "waist",
        "hips",
        "left_thigh",
        "right_thigh",
        "left_calf",
        "right_calf",
      ],
    },
  },
} as const
