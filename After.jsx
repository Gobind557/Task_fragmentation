import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  parseEther,
  chainTokenSymbols,
  CoinGeckoApi,
  fetchAddressForChain,
  isChainTestnet,
  sepolia,
  avalancheFuji,
  fantomTestnet,
  mainnet,
  avalanche,
  fantom,
  numberWithCommas,
  prettyEthAddress,
} from '../utils';
import { oftAbi } from '../constants';

export const useBurn = () => {
  const [burnAmount, setBurnAmount] = useState('');
  const [txButton, setTxButton] = useState<BurnTxProgress>(BurnTxProgress.default);
  const [txProgress, setTxProgress] = useState(false);
  const [approveTxHash, setApproveTxHash] = useState<string | null>(null);
  const [burnTxHash, setBurnTxHash] = useState<string | null>(null);
  const [coinData, setCoinData] = useState<any>({});

  const { walletAddress, isWalletConnected, walletChain, chains, openChainModal } = useWallet();
  const { suppliesChain, setSuppliesChain, fetchSupplies, allSupplies } = useAppSupplies(true);
  const { toastMsg, toastSev, showToast } = useAppToast();

  const [burnTransactions, setBurnTransactions] = useState<any[]>([]);

  const ethersSigner = useEthersSigner({
    chainId: walletChain?.id ?? chainEnum.mainnet,
  });

  const executeBurn = async () => {
    if (!isWalletConnected) {
      openConnectModal();
      return;
    }
    if (burnAmount === '') {
      console.log('Enter amount to migrate');
      showToast("Enter amount to migrate", ToastSeverity.warning);
      return;
    }
    const newTokenAddress = fetchAddressForChain(walletChain?.id, "newToken");
    const oftTokenContract = new Contract(
      newTokenAddress,
      oftAbi,
      ethersSigner
    );
    let amount = parseEther(burnAmount);
    setTxButton(BurnTxProgress.burning);
    setTxProgress(true);
    try {
      const burnTx = await oftTokenContract.burn(
        //tokenAddress,
        amount
      );
      setBurnTxHash(burnTx.hash);
      console.log(burnTx, burnTx.hash);
      await burnTx.wait();
      setTxButton(BurnTxProgress.default);
      setTxProgress(false);
      refetchTransactions();
      fetchSupplies();
    } catch (err) {
      console.log(err);
      setTxButton(BurnTxProgress.default);
      setTxProgress(false);
      showToast("Burn Failed!", ToastSeverity.error);
      return;
    }
  };

  useEffect(() => {
    if (!walletChain) return;
    let isSubscribed = true;
    // const newTokenAddress = fetchAddressForChain(
    //   walletChain?.id,
    //   isOldToken ? "oldToken" : "newToken"
    // );
    if (isSubscribed) setBurnTransactions([]);
    const isTestnet = isChainTestnet(walletChain?.id);
    let _chainObjects: any[] = [mainnet, avalanche, fantom];
    if (isTestnet) _chainObjects = [sepolia, avalancheFuji, fantomTestnet];
    Promise.all(ChainScanner.fetchAllTxPromises(isTestnet))
      .then((results: any) => {
        //console.log(results, isTestnet);
        if (isSubscribed) {
          let new_chain_results: any[] = [];
          results.forEach((results_a: any[], index: number) => {
            new_chain_results.push(
              results_a.map((tx: any) => ({
                ...tx,
                chain:
