"use client";
import { t as translateCopy } from "@/lib/i18n";

import { TradeProvider, useTrade } from "./TradeContext";
import Step1Details from "./steps/Step1Details";
import Step2Negotiation from "./steps/Step2Negotiation";
import Step3Review from "./steps/Step3Review";
import StepIndicator from "@/components/ui/StepIndicator";
import Link from "next/link";
import { useState } from "react";

const STEPS = [
  { index: 1, label: "Details" },
  { index: 2, label: "Negotiation" },
  { index: 3, label: "Review" },
];

function CreateTradeInner() {
  const { step, resetTradeWizard } = useTrade();
  const [createdTrade, setCreatedTrade] = useState<{ tradeId: string; transactionHash: string } | null>(null);

  const handleTradeCreated = (trade: { tradeId: string; transactionHash: string }) => {
    setCreatedTrade(trade);
    resetTradeWizard();
  };

  const handleStartNewTrade = () => {
    resetTradeWizard();
    setCreatedTrade(null);
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <Link href="/" className="text-text-muted text-sm hover:text-text-secondary transition-colors">
            {translateCopy("ui.back_c32ae9f")}
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">{translateCopy("ui.create_trade_2747e94")}</h1>
          <p className="text-text-secondary text-sm mt-1">
            {translateCopy("ui.lock_agricultural_commodity_valu_6207352")}
          </p>
        </div>

        <div className="bg-bg-card rounded-xl border border-border-default p-6 shadow-card">
          {!createdTrade && <StepIndicator />}
          {createdTrade ? (
            <Step3Review completedTrade={createdTrade} onStartNewTrade={handleStartNewTrade} />
          ) : (
            <>
              {step === 1 && <Step1Details />}
              {step === 2 && <Step2Negotiation />}
              {step === 3 && <Step3Review onCreated={handleTradeCreated} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreateTradePage() {
  return (
    <TradeProvider>
      <CreateTradeInner />
    </TradeProvider>
  );
}
