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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          emoji: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          position: number
          slug: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          position?: number
          slug: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          position?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          commission_amount: number
          created_at: string
          gross_amount: number
          id: string
          is_demo: boolean
          order_id: string | null
          rate: number
          reference: string
          seller_amount: number
          seller_id: string | null
          status: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          gross_amount?: number
          id?: string
          is_demo?: boolean
          order_id?: string | null
          rate?: number
          reference?: string
          seller_amount?: number
          seller_id?: string | null
          status?: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          gross_amount?: number
          id?: string
          is_demo?: boolean
          order_id?: string | null
          rate?: number
          reference?: string
          seller_amount?: number
          seller_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          seller_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          seller_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          seller_id?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string | null
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          audience: string
          body: string | null
          created_at: string
          id: string
          is_demo: boolean
          kind: string
          read_at: string | null
          recipient_id: string | null
          title: string
        }
        Insert: {
          audience?: string
          body?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          kind: string
          read_at?: string | null
          recipient_id?: string | null
          title: string
        }
        Update: {
          audience?: string
          body?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          kind?: string
          read_at?: string | null
          recipient_id?: string | null
          title?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          commission_amount: number
          created_at: string
          customer_id: string | null
          delivery_address: string | null
          delivery_phone: string | null
          delivery_status: string
          id: string
          is_demo: boolean
          payment_status: string
          reference: string
          seller_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          store_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          customer_id?: string | null
          delivery_address?: string | null
          delivery_phone?: string | null
          delivery_status?: string
          id?: string
          is_demo?: boolean
          payment_status?: string
          reference?: string
          seller_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          customer_id?: string | null
          delivery_address?: string | null
          delivery_phone?: string | null
          delivery_status?: string
          id?: string
          is_demo?: boolean
          payment_status?: string
          reference?: string
          seller_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_id: string | null
          id: string
          is_demo: boolean
          order_id: string | null
          provider: string | null
          provider_reference: string | null
          reference: string
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          is_demo?: boolean
          order_id?: string | null
          provider?: string | null
          provider_reference?: string | null
          reference?: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          is_demo?: boolean
          order_id?: string | null
          provider?: string | null
          provider_reference?: string | null
          reference?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_demo: boolean
          method: string | null
          seller_id: string | null
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          is_demo?: boolean
          method?: string | null
          seller_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_demo?: boolean
          method?: string | null
          seller_id?: string | null
          status?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          is_sensitive: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          is_sensitive?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          is_sensitive?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          images: string[]
          is_demo: boolean
          is_featured: boolean
          name: string
          price: number
          seller_id: string | null
          status: Database["public"]["Enums"]["product_status"]
          stock: number
          store_id: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          images?: string[]
          is_demo?: boolean
          is_featured?: boolean
          name: string
          price?: number
          seller_id?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          images?: string[]
          is_demo?: boolean
          is_featured?: boolean
          name?: string
          price?: number
          seller_id?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          email: string | null
          email_verified: boolean
          full_name: string
          id: string
          last_active_at: string | null
          phone: string | null
          phone_verified: boolean
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean
          full_name?: string
          id: string
          last_active_at?: string | null
          phone?: string | null
          phone_verified?: boolean
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean
          full_name?: string
          id?: string
          last_active_at?: string | null
          phone?: string | null
          phone_verified?: boolean
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          reason: string
          reporter_id: string | null
          severity: string
          status: string
          target_id: string | null
          target_label: string | null
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          reason: string
          reporter_id?: string | null
          severity?: string
          status?: string
          target_id?: string | null
          target_label?: string | null
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          reason?: string
          reporter_id?: string | null
          severity?: string
          status?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          banner_url: string | null
          city: string | null
          created_at: string
          description: string | null
          id: string
          is_demo: boolean
          is_featured: boolean
          logo_url: string | null
          owner_id: string | null
          phone: string | null
          rating: number
          slug: string | null
          status: Database["public"]["Enums"]["store_status"]
          store_name: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          is_featured?: boolean
          logo_url?: string | null
          owner_id?: string | null
          phone?: string | null
          rating?: number
          slug?: string | null
          status?: Database["public"]["Enums"]["store_status"]
          store_name: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          is_featured?: boolean
          logo_url?: string | null
          owner_id?: string | null
          phone?: string | null
          rating?: number
          slug?: string | null
          status?: Database["public"]["Enums"]["store_status"]
          store_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          commission: number
          created_at: string
          customer_id: string | null
          id: string
          is_demo: boolean
          order_id: string | null
          provider: string | null
          seller_id: string | null
          status: string
        }
        Insert: {
          amount?: number
          commission?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          is_demo?: boolean
          order_id?: string | null
          provider?: string | null
          seller_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          commission?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          is_demo?: boolean
          order_id?: string | null
          provider?: string | null
          seller_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_ledger: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          entry_type: string
          id: string
          reference: string
          source_id: string | null
          source_type: string | null
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          entry_type: string
          id?: string
          reference?: string
          source_id?: string | null
          source_type?: string | null
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          entry_type?: string
          id?: string
          reference?: string
          source_id?: string | null
          source_type?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_ledger_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          created_at: string
          currency: string
          id: string
          kind: string
          owner_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          kind: string
          owner_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          kind?: string
          owner_id?: string | null
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_demo: boolean
          method: string | null
          processed_at: string | null
          reference: string
          seller_id: string | null
          seller_label: string | null
          status: string
          transaction_reference: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          is_demo?: boolean
          method?: string | null
          processed_at?: string | null
          reference?: string
          seller_id?: string | null
          seller_label?: string | null
          status?: string
          transaction_reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_demo?: boolean
          method?: string | null
          processed_at?: string | null
          reference?: string
          seller_id?: string | null
          seller_label?: string | null
          status?: string
          transaction_reference?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_action: {
        Args: {
          _action: string
          _note?: string
          _target_id: string
          _target_type: string
          _value?: string
        }
        Returns: undefined
      }
      admin_update_setting: {
        Args: { _key: string; _value: Json }
        Returns: undefined
      }
      admin_upsert_category: {
        Args: {
          _emoji: string
          _id: string
          _name: string
          _position: number
          _slug: string
        }
        Returns: string
      }
    }
    Enums: {
      account_status: "active" | "suspended" | "pending_verification"
      app_role: "client" | "seller" | "admin" | "super_admin"
      order_status:
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
      product_status:
        | "draft"
        | "active"
        | "hidden"
        | "removed"
        | "pending_review"
        | "published"
        | "rejected"
        | "suspended"
      store_status: "pending" | "approved" | "suspended" | "active" | "rejected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_status: ["active", "suspended", "pending_verification"],
      app_role: ["client", "seller", "admin", "super_admin"],
      order_status: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
      ],
      product_status: [
        "draft",
        "active",
        "hidden",
        "removed",
        "pending_review",
        "published",
        "rejected",
        "suspended",
      ],
      store_status: ["pending", "approved", "suspended", "active", "rejected"],
    },
  },
} as const
