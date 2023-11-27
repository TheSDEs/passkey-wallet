"use client";

import { TurnkeyClient } from '@turnkey/http'
import axios from 'axios';
import { exportWalletUrl } from "../utils/urls"
import { useEffect, useState } from 'react';
import { IframeStamper } from '@turnkey/iframe-stamper';
import { WebauthnStamper } from '@turnkey/webauthn-stamper';
import { Export } from "@/components/Export";

type ExportWalletProps = {
  walletId: string;
  walletAddress: string;
  organizationId: string;
}

export function ExportWallet(props: ExportWalletProps) {
  const [iframeDisplay, setIframeDisplay] = useState("none")
  const [iframeStamper, setIframeStamper] = useState<IframeStamper | null>(null);
  const [agreements, setAgreements] = useState({
    agreement1: false,
    agreement2: false,
    agreement3: false,
  });
  const [disabledReveal, setDisabledReveal] = useState(true);

  const handleAgreementChange = (event: { target: { id: any; checked: any; }; }) => {
    const { id, checked } = event.target;
    setAgreements(prev => ({
      ...prev,
      [id]: checked
    }));
  };

  useEffect(() => {
    const allChecked = Object.values(agreements).every(Boolean);
    setDisabledReveal(!allChecked);
  }, [agreements]);

  async function exportWallet() {
    if (iframeStamper === null) {
      throw new Error("cannot perform export without an iframeStamper");
    }

    const webauthnStamper = new WebauthnStamper({
      rpId: process.env.NEXT_PUBLIC_DEMO_PASSKEY_WALLET_RPID!,
    });

    const client = new TurnkeyClient(
      {
        baseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL!,
      },
      webauthnStamper
    );

    const signedRequest = await client.stampExportWallet({
      type: "ACTIVITY_TYPE_EXPORT_WALLET",
      timestampMs: String(Date.now()),
      organizationId: props.organizationId,
      parameters: {
        walletId: props.walletId,
        targetPublicKey: iframeStamper.publicKey()!,
      },
    });

    const res = await axios.post(exportWalletUrl(), {
      signedExportRequest: signedRequest,
    });

    if (res.status === 200) {
      try {
        await iframeStamper.injectWalletExportBundle(res.data);
        setIframeDisplay("block");
      } catch (e: any){
        throw new Error("unexpected error while injecting recovery bundle: " + e.toString());
      } 
    }
  };

  return (
    <div className="w-full">
      <div>
        {!iframeStamper && (
          <p className="space-y-4 max-w-lg mx-auto text-center">loading...</p>
        )}
        {iframeStamper && (
          <div className="text-center px-6 py-4">
            <h2 className="text-lg md:text-2xl font-semibold">Before you continue</h2>
            <p className="px-4 py-2">
              By revealing this wallet seedphrase for <span className="font-mono text-gray-800">{props.walletAddress}</span> you understand that:
            </p>
            <ul className="space-y-2 mt-4">
              <li key="agreement1" className="flex items-start my-4">
              <input
                type="checkbox"
                id="agreement1"
                checked={agreements["agreement1"]}
                onChange={handleAgreementChange}
                className="w-4 h-4 text-zinc-600 bg-gray-100 border-gray-300 rounded focus:ring-zinc-500 dark:focus:ring-zinc-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="agreement1" className="text-justify px-4">You should never share your private key with anyone, including the Turnkey team. Turnkey will never ask you for your private key.</label>
              </li>              
              <li key="agreement2" className="flex items-start my-4">
              <input
                type="checkbox"
                id="agreement2"
                checked={agreements["agreement2"]}
                onChange={handleAgreementChange}
                className="w-4 h-4 text-zinc-600 bg-gray-100 border-gray-300 rounded focus:ring-zinc-500 dark:focus:ring-zinc-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="agreement2" className="text-justify px-4">You are responsible for the security of this private key and any assets associated with it.</label>
              </li>
              <li key="agreement3" className="flex items-start my-4">
              <input
                type="checkbox"
                id="agreement3"
                checked={agreements["agreement3"]}
                onChange={handleAgreementChange}
                className="w-4 h-4 text-zinc-600 bg-gray-100 border-gray-300 rounded focus:ring-zinc-500 dark:focus:ring-zinc-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="agreement3" className="text-justify px-4">Turnkey is not responsible for any other wallet software you may use with this private key.</label>
              </li>
            </ul>
            <div className="flex justify-center items-center mt-6">
              <button
                disabled={disabledReveal}
                className="block rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:hover:bg-zinc-900 disabled:opacity-75"
                onClick={() => exportWallet()}>
                Reveal seedphrase
              </button>
            </div>
          </div>
        )}
      </div>

      <Export
        setIframeStamper={setIframeStamper}
        iframeDisplay={iframeDisplay}
        iframeUrl={process.env.NEXT_PUBLIC_EXPORT_IFRAME_URL!}
      ></Export>
    </div>
  )
};
