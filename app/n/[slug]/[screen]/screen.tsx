"use client";

import { TenantView, TenantViewContext } from "@/lib/tenant-view";
import Registration from "@/app/registro/page";
import Wallet from "@/app/wallet/page";
import Login from "@/app/login/page";
import Cashier from "@/app/barista/page";
import Terms from "@/app/terminos/page";
import Privacy from "@/app/privacidad/page";

const screens = { registro: Registration, wallet: Wallet, login: Login, barista: Cashier, terminos: Terms, privacidad: Privacy };

export function BusinessScreen({ tenant, screen }: { tenant: TenantView; screen: string }) {
  const Screen = screens[screen as keyof typeof screens];
  return <TenantViewContext.Provider value={tenant}>
    <div style={{ "--brand-primary": tenant.color, "--brand-secondary": tenant.accent } as React.CSSProperties}>
      <Screen />
    </div>
  </TenantViewContext.Provider>;
}
