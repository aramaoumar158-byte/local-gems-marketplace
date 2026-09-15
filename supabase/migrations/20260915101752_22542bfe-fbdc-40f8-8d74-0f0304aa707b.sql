CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  chosen public.app_role;
BEGIN
  chosen := CASE WHEN NEW.raw_user_meta_data ->> 'role' = 'seller' THEN 'seller'::public.app_role
                 ELSE 'client'::public.app_role END;

  INSERT INTO public.profiles (id, full_name, phone, email, status, phone_verified, email_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'contact_email', ''),
    'pending_verification',
    false,
    false
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, chosen)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;