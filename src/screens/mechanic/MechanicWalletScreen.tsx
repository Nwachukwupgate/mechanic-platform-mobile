import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  RefreshControl,
  AppState,
  AppStateStatus,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { walletAPI, mechanicsAPI } from '../../services/api'
import { getApiErrorMessage } from '../../services/api'
import { colors } from '../../theme/colors'
import { fonts } from '../../theme/fonts'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { LoadingOverlay } from '../../components/LoadingOverlay'
import { PaystackCheckoutModal } from '../../components/PaystackCheckoutModal'
import { InfoHint } from '../../components/InfoHint'

type BankAccount = {
  id: string
  bankCode: string
  bankName: string
  accountNumber: string
  accountName: string
  isDefault: boolean
}

type WalletSummaryBalance = {
  netMinor: number
  netNaira: number
  availableToWithdrawMinor: number
  availableToWithdrawNaira: number
  unpaidPlatformFeeMinor: number
  unpaidPlatformFeeNaira: number
  grossUnpaidPlatformFeeAfterSuccessMinor?: number
  grossUnpaidPlatformFeeAfterSuccessNaira?: number
  pendingPlatformFeeCheckoutMinor?: number
  pendingPlatformFeeCheckoutNaira?: number
  currency: string
}

type PendingPlatformFeeCheckout = {
  id: string
  amountMinor: number
  amountNaira: number
  internalReference: string | null
  paystackReference: string | null
  authorizationUrl: string
  createdAt: string
  bookingId: string | null
  description: string | null
}

type PendingWithdrawal = {
  id: string
  amountMinor: number
  amountNaira: number
  reference: string | null
  description: string | null
  createdAt: string
  feeChargedMinor?: number
  feeChargedNaira?: number
}

export function MechanicWalletScreen() {
  const navigation = useNavigation()
  const initialLoadDone = useRef(false)
  const pendingFeePaystackRef = useRef<string | null>(null)
  const verifyingFeePaystackRef = useRef(false)
  const [summary, setSummary] = useState<{
    balance: WalletSummaryBalance & { pendingWithdrawalsMinor?: number }
    recentTransactions: any[]
    pendingPlatformFeeCheckouts?: PendingPlatformFeeCheckout[]
    pendingWithdrawals?: PendingWithdrawal[]
  } | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddBank, setShowAddBank] = useState(false)
  const [showBankPicker, setShowBankPicker] = useState(false)
  const [addForm, setAddForm] = useState({ bankCode: '', bankName: '', accountNumber: '', accountName: '' })
  const [submitting, setSubmitting] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [editForm, setEditForm] = useState({ bankCode: '', bankName: '', accountNumber: '', accountName: '' })
  const [showEditBankPicker, setShowEditBankPicker] = useState(false)
  const [updatingBank, setUpdatingBank] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [payingPlatformFee, setPayingPlatformFee] = useState(false)
  const [paystackFeeUrl, setPaystackFeeUrl] = useState<string | null>(null)
  const [paystackFeeRef, setPaystackFeeRef] = useState<string | null>(null)
  const [cancellingCheckoutId, setCancellingCheckoutId] = useState<string | null>(null)

  const loadData = () => {
    return Promise.all([
      walletAPI.getSummary().then((r) => setSummary(r.data)).catch(() => setSummary(null)),
      walletAPI
        .getTransactions({ limit: 100 })
        .then((r) => setTransactions(r.data.items ?? []))
        .catch(() => setTransactions([])),
      mechanicsAPI.listBankAccounts().then((r) => setBankAccounts(r.data)).catch(() => setBankAccounts([])),
      walletAPI.getBanks().then((r) => setBanks(r.data)).catch(() => setBanks([])),
    ])
  }

  const runLoad = useCallback(async (withSpinner: boolean) => {
    if (withSpinner) setLoading(true)
    try {
      await loadData()
    } finally {
      if (withSpinner) setLoading(false)
    }
  }, [])

  const tryVerifyMechanicFeePayment = useCallback(async () => {
    const ref = pendingFeePaystackRef.current
    if (!ref || verifyingFeePaystackRef.current) return
    verifyingFeePaystackRef.current = true
    try {
      const r = await walletAPI.verifyMechanicFeePayment(ref)
      if (r.data?.success) {
        pendingFeePaystackRef.current = null
        setPaystackFeeUrl(null)
        setPaystackFeeRef(null)
        await loadData()
        Alert.alert('Payment successful', 'Your platform fee payment was received.')
      }
    } catch {
      // Still pending, cancelled, or network error; keep pending ref for retry on next focus
    } finally {
      verifyingFeePaystackRef.current = false
    }
  }, [])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') void tryVerifyMechanicFeePayment()
    })
    return () => sub.remove()
  }, [tryVerifyMechanicFeePayment])

  /** So returning mechanics still get auto-verify after paying, even if the WebView was cleared. */
  useEffect(() => {
    const pendings = summary?.pendingPlatformFeeCheckouts
    if (pendings?.length && pendings[0].paystackReference) {
      pendingFeePaystackRef.current = pendings[0].paystackReference
    }
    if (!pendings?.length && !paystackFeeUrl) {
      pendingFeePaystackRef.current = null
    }
  }, [summary?.pendingPlatformFeeCheckouts, paystackFeeUrl])

  useFocusEffect(
    useCallback(() => {
      const first = !initialLoadDone.current
      initialLoadDone.current = true
      void runLoad(first)
    }, [runLoad])
  )

  useFocusEffect(
    useCallback(() => {
      void tryVerifyMechanicFeePayment()
    }, [tryVerifyMechanicFeePayment])
  )

  const onRefresh = () => {
    setRefreshing(true)
    loadData().finally(() => setRefreshing(false))
  }

  const handleAddBank = async () => {
    if (!addForm.bankCode || addForm.accountNumber.length < 10 || !addForm.accountName.trim()) {
      Alert.alert('Error', 'Please select a bank, enter at least 10-digit account number, and account name.')
      return
    }
    setSubmitting(true)
    try {
      await mechanicsAPI.addBankAccount({
        bankCode: addForm.bankCode,
        bankName: addForm.bankName,
        accountNumber: addForm.accountNumber,
        accountName: addForm.accountName.trim(),
      })
      setAddForm({ bankCode: '', bankName: '', accountNumber: '', accountName: '' })
      setShowAddBank(false)
      loadData()
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e, 'Failed to add account'))
    } finally {
      setSubmitting(false)
    }
  }

  const setDefault = async (accountId: string) => {
    try {
      await mechanicsAPI.setDefaultBankAccount(accountId)
      loadData()
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e))
    }
  }

  const openEditBank = (acc: BankAccount) => {
    setEditingAccount(acc)
    setEditForm({
      bankCode: acc.bankCode,
      bankName: acc.bankName,
      accountNumber: acc.accountNumber,
      accountName: acc.accountName,
    })
  }

  const handleUpdateBank = async () => {
    if (!editingAccount || !editForm.bankCode || editForm.accountNumber.length < 10 || !editForm.accountName.trim()) {
      Alert.alert('Error', 'Please select a bank, enter at least 10-digit account number, and account name.')
      return
    }
    setUpdatingBank(true)
    try {
      await mechanicsAPI.updateBankAccount(editingAccount.id, {
        bankCode: editForm.bankCode,
        bankName: editForm.bankName,
        accountNumber: editForm.accountNumber,
        accountName: editForm.accountName.trim(),
      })
      setEditingAccount(null)
      loadData()
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e, 'Failed to update account'))
    } finally {
      setUpdatingBank(false)
    }
  }

  const deleteAccount = (acc: BankAccount) => {
    Alert.alert('Remove account', `Remove ${acc.bankName}, ${acc.accountNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await mechanicsAPI.deleteBankAccount(acc.id)
            loadData()
          } catch (e: any) {
            Alert.alert('Error', getApiErrorMessage(e))
          }
        },
      },
    ])
  }

  const bal = summary?.balance
  const grossWithdrawableMinor = bal?.availableToWithdrawMinor ?? 0
  const unpaidFeeMinor = bal?.unpaidPlatformFeeMinor ?? 0
  // Auto-net fee debt against platform-paid earnings before presenting withdrawable cash.
  const autoSettledFeeMinor = Math.min(grossWithdrawableMinor, unpaidFeeMinor)
  const remainingUnpaidFeeMinor = Math.max(0, unpaidFeeMinor - grossWithdrawableMinor)
  const availableMinor = Math.max(0, grossWithdrawableMinor - unpaidFeeMinor)
  const unpaidFeeNairaDisplay = remainingUnpaidFeeMinor / 100
  const displayedNetMinor = availableMinor - remainingUnpaidFeeMinor
  const netNaira = displayedNetMinor / 100
  const pendingFeeCheckouts = summary?.pendingPlatformFeeCheckouts ?? []
  const pendingFeeReservedMinor = pendingFeeCheckouts.reduce((s, p) => s + (p.amountMinor ?? 0), 0)
  const pendingCheckoutMinor = bal?.pendingPlatformFeeCheckoutMinor ?? pendingFeeReservedMinor
  const grossFeeAfterSuccessMinor =
    bal?.grossUnpaidPlatformFeeAfterSuccessMinor ??
    (pendingCheckoutMinor > 0 ? unpaidFeeMinor + pendingCheckoutMinor : unpaidFeeMinor)
  /** Full-balance Paystack init is blocked while any pending checkout holds capacity. */
  const blockedByPendingCheckout = pendingFeeReservedMinor > 0
  const pendingWithdrawals = summary?.pendingWithdrawals ?? []
  const defaultBank = bankAccounts.find((a) => a.isDefault)

  const runWithdraw = async (amountMinor: number, displayNaira: number) => {
    setWithdrawing(true)
    try {
      const res = await walletAPI.withdraw(amountMinor)
      const d = res.data
      setWithdrawAmount('')
      await loadData()
      const dest =
        d?.destinationBank && d?.destinationAccountLast4
          ? `${d.destinationBank}, ****${d.destinationAccountLast4}`
          : 'your default bank account'
      const refLine = d?.reference ? `\nReference: ${d.reference}` : ''
      const feeMinor = d?.feeChargedMinor
      const feeLine =
        typeof feeMinor === 'number' && feeMinor > 0
          ? `\nPaystack transfer fee (charged to the platform): ₦${(feeMinor / 100).toLocaleString()}`
          : ''

      if (d?.transferStatus === 'processing') {
        Alert.alert(
          'Withdrawal processing',
          `₦${displayNaira.toLocaleString(undefined, { maximumFractionDigits: 2 })} is queued to ${dest}.${refLine}\n\nPaystack is moving the funds; this usually finishes within a few minutes. Your wallet updates automatically when they confirm success (or releases the hold if it fails). Pull to refresh on this screen to check status.`,
        )
        return
      }

      Alert.alert(
        'Withdrawal completed',
        `₦${displayNaira.toLocaleString(undefined, { maximumFractionDigits: 2 })} was sent to ${dest}.${refLine}${feeLine}\n\nYou will see this in your transaction history.`,
      )
    } catch (e: any) {
      Alert.alert('Withdrawal failed', getApiErrorMessage(e, 'Could not complete withdrawal'))
    } finally {
      setWithdrawing(false)
    }
  }

  const handleWithdraw = () => {
    const naira = parseFloat(withdrawAmount)
    if (!Number.isFinite(naira) || naira < 1) {
      Alert.alert('Error', 'Enter a valid amount (min ₦1)')
      return
    }
    const amountMinor = Math.round(naira * 100)
    if (amountMinor < 100) {
      Alert.alert('Error', 'Minimum withdrawal is ₦1')
      return
    }
    if (amountMinor > availableMinor) {
      Alert.alert('Error', 'Amount exceeds withdrawable balance (platform-paid earnings)')
      return
    }
    if (!defaultBank) {
      Alert.alert('Add a bank account', 'Set a default withdrawal account below before withdrawing.')
      return
    }
    const masked = `${defaultBank.bankName}, ****${defaultBank.accountNumber.slice(-4)}`
    Alert.alert(
      'Confirm withdrawal',
      `Send ₦${naira.toLocaleString(undefined, { maximumFractionDigits: 2 })} to ${masked}?`,
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => void runWithdraw(amountMinor, naira),
        },
      ],
    )
  }

  const setWithdrawAmountAll = () => {
    if (availableMinor < 100) return
    const n = availableMinor / 100
    setWithdrawAmount(Number.isInteger(n) ? String(n) : n.toFixed(2))
  }

  const setWithdrawAmountHalf = () => {
    if (availableMinor < 200) return
    const halfMinor = Math.floor(availableMinor / 2)
    const n = halfMinor / 100
    setWithdrawAmount(Number.isInteger(n) ? String(n) : n.toFixed(2))
  }

  const openContinuePlatformFeeCheckout = (p: PendingPlatformFeeCheckout) => {
    const ref = p.paystackReference?.trim()
    if (!ref) {
      Alert.alert('Cannot continue', 'This checkout has no payment reference. Try cancelling it and starting again.')
      return
    }
    if (!p.authorizationUrl?.trim()) {
      Alert.alert(
        'Cannot reopen checkout',
        'The payment link for this session is missing. Cancel this checkout, then start a new payment.',
      )
      return
    }
    pendingFeePaystackRef.current = ref
    setPaystackFeeUrl(p.authorizationUrl.trim())
    setPaystackFeeRef(ref)
  }

  const confirmCancelPlatformFeeCheckout = (p: PendingPlatformFeeCheckout) => {
    const ref = (p.paystackReference ?? p.internalReference ?? '').trim()
    if (!ref) {
      Alert.alert('Cannot cancel', 'Missing checkout reference. Contact support if this persists.')
      return
    }
    Alert.alert(
      'Cancel checkout?',
      'Only cancel if you did not complete payment on Paystack. If you already paid, choose Continue or wait a moment; we will detect the payment automatically.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel checkout',
          style: 'destructive',
          onPress: async () => {
            setCancellingCheckoutId(p.id)
            try {
              const r = await walletAPI.cancelMechanicFeeCheckout(ref)
              if (r.data?.outcome === 'finalized') {
                await loadData()
                Alert.alert('Payment found', 'Your payment went through. Your wallet is updated.')
              } else {
                await loadData()
                Alert.alert('Checkout cleared', 'You can start a new card payment when you are ready.')
              }
            } catch (e: any) {
              Alert.alert('Could not cancel', getApiErrorMessage(e, 'Try again in a moment.'))
            } finally {
              setCancellingCheckoutId(null)
            }
          },
        },
      ],
    )
  }

  const handlePayPlatformFee = async () => {
    if (remainingUnpaidFeeMinor < 100) {
      Alert.alert('Nothing to pay', 'You have no platform fee balance due right now.')
      return
    }
    if (blockedByPendingCheckout) {
      Alert.alert(
        'Finish or cancel your pending checkout',
        'You already started a card payment. Use Continue payment below, or cancel that checkout to start a new one.',
      )
      return
    }
    setPayingPlatformFee(true)
    try {
      const res = await walletAPI.initializeMechanicFeePayment({
        amountMinor: remainingUnpaidFeeMinor,
      })
      const url = res.data?.authorizationUrl
      const ref = res.data?.reference
      if (url && ref) {
        pendingFeePaystackRef.current = ref
        setPaystackFeeUrl(url)
        setPaystackFeeRef(ref)
      }
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e, 'Could not start payment'))
    } finally {
      setPayingPlatformFee(false)
    }
  }

  const openTxDetail = (id: string) => {
    const parent = navigation.getParent?.() as { navigate: (name: string, params: object) => void } | undefined
    parent?.navigate('MechanicTransactionDetail', { transactionId: id })
  }

  const txTitle = (type: string) => {
    switch (type) {
      case 'USER_PAYMENT':
        return 'Customer payment (platform)'
      case 'PLATFORM_PAYOUT':
        return 'Withdrawal'
      case 'MECHANIC_FEE':
        return 'Platform fee'
      case 'PLATFORM_FEE_AUTO_SETTLEMENT':
      case 'AUTO_PLATFORM_FEE_SETTLEMENT':
      case 'FEE_SETTLEMENT':
        return 'Auto fee settlement'
      case 'REFUND':
        return 'Refund'
      default:
        return type.replace(/_/g, ' ')
    }
  }

  const txSignedAmount = (t: { type: string; amountNaira: number; status?: string }) => {
    const n = t.amountNaira ?? 0
    const pending = t.status === 'PENDING'
    if (
      t.type === 'PLATFORM_PAYOUT' ||
      t.type === 'MECHANIC_FEE' ||
      t.type === 'PLATFORM_FEE_AUTO_SETTLEMENT' ||
      t.type === 'AUTO_PLATFORM_FEE_SETTLEMENT' ||
      t.type === 'FEE_SETTLEMENT'
    ) {
      return { text: `-${'\u20A6'}${n.toLocaleString()}`, outgoing: true, pending }
    }
    return { text: `+${'\u20A6'}${n.toLocaleString()}`, outgoing: false, pending }
  }

  if (loading) return <LoadingOverlay />

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Wallet</Text>
      <Text style={styles.subtitle}>Net balance, withdrawals, fees, and history</Text>

      <Card style={styles.balanceCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary[100] }]}>
            <Ionicons name="wallet" size={24} color={colors.primary[600]} />
          </View>
          <View style={styles.cardLabelRow}>
            <Text style={styles.cardLabel}>Your balance</Text>
            <InfoHint
              title="Your balance"
              message="Available to withdraw is your 80% share from platform-paid jobs after automatically settling any unpaid 20% fee debt from direct-paid jobs. If debt is larger than earnings, the remaining debt still shows under amount due. Your balance (large number) is available-to-withdraw minus any remaining debt."
              iconSize={18}
              iconColor={colors.neutral[500]}
            />
          </View>
        </View>
        <Text
          style={[
            styles.heroAmount,
            { color: netNaira >= 0 ? colors.accent.green : colors.accent.red },
          ]}
        >
          {netNaira >= 0 ? '' : '-'}₦{Math.abs(netNaira).toLocaleString()}
        </Text>
        <Text style={styles.balanceMeta}>
          Available to withdraw now: ₦{(availableMinor / 100).toLocaleString()}
        </Text>
        <Text style={styles.balanceMeta}>
          Platform fee amount due (remaining): ₦
          {unpaidFeeNairaDisplay.toLocaleString()}
        </Text>
        {autoSettledFeeMinor > 0 ? (
          <Text style={styles.balanceMetaNote}>
            Auto-settled from your platform earnings: ₦{(autoSettledFeeMinor / 100).toLocaleString()}
          </Text>
        ) : null}
        {pendingCheckoutMinor > 0 ? (
          <Text style={styles.balanceMetaNote}>
            ₦{(pendingCheckoutMinor / 100).toLocaleString()} in Paystack fee checkout
            {grossFeeAfterSuccessMinor > unpaidFeeMinor
              ? ` · before checkout, 20% due was ₦${(grossFeeAfterSuccessMinor / 100).toLocaleString()}`
              : ''}
            . Your balance already reflects this checkout.
          </Text>
        ) : null}
      </Card>

      {/* Withdraw to bank */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accent.green + '20' }]}>
            <Ionicons name="arrow-down-circle" size={24} color={colors.accent.green} />
          </View>
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionTitle}>Withdraw to bank</Text>
            <Text style={styles.sectionSubtitle}>
              From platform-paid jobs only (your 80% share after our 20% fee). Money is sent with Paystack to your
              default account.
            </Text>
          </View>
        </View>
        {defaultBank ? (
          <View style={styles.withdrawDestination}>
            <Ionicons name="business-outline" size={18} color={colors.primary[600]} />
            <Text style={styles.withdrawDestinationText}>
              Sending to <Text style={styles.withdrawDestinationStrong}>{defaultBank.bankName}</Text>, ****
              {defaultBank.accountNumber.slice(-4)} ({defaultBank.accountName})
            </Text>
          </View>
        ) : bankAccounts.length > 0 ? (
          <Text style={styles.withdrawWarning}>Choose a default account below to enable withdrawals.</Text>
        ) : (
          <Text style={styles.withdrawWarning}>Add a bank account below to withdraw earnings.</Text>
        )}
        {pendingWithdrawals.length > 0 ? (
          <View style={styles.withdrawPendingBanner}>
            <Ionicons name="sync-outline" size={18} color={colors.primary[700]} />
            <Text style={styles.withdrawPendingText}>
              {pendingWithdrawals.length === 1
                ? 'One withdrawal is still being finalized with Paystack. Your available balance already excludes that amount; it will clear when we receive success or failure from Paystack.'
                : `${pendingWithdrawals.length} withdrawals are still being finalized with Paystack. Your available balance already excludes those amounts.`}
            </Text>
          </View>
        ) : null}
        <Text style={styles.withdrawAvailableLabel}>
          Available to withdraw:{' '}
          <Text style={styles.withdrawAvailableAmount}>₦{(availableMinor / 100).toLocaleString()}</Text>
        </Text>
        {availableMinor >= 100 ? (
          <View style={styles.quickWithdrawRow}>
            <TouchableOpacity style={styles.quickWithdrawChip} onPress={setWithdrawAmountAll} activeOpacity={0.7}>
              <Text style={styles.quickWithdrawChipText}>Withdraw all</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickWithdrawChip} onPress={setWithdrawAmountHalf} activeOpacity={0.7}>
              <Text style={styles.quickWithdrawChipText}>Half</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <Input
          label="Amount (₦)"
          hint="The amount you enter is what we send to your bank. Paystack may charge the platform a separate transfer fee depending on your plan."
          hintTitle="Withdrawal amount"
          value={withdrawAmount}
          onChangeText={setWithdrawAmount}
          placeholder="0"
          keyboardType="decimal-pad"
        />
        <Button
          title={withdrawing ? 'Sending…' : 'Withdraw'}
          onPress={handleWithdraw}
          loading={withdrawing}
          disabled={availableMinor < 100 || !defaultBank}
        />
        {availableMinor < 100 && (
          <Text style={styles.emptyText}>No withdrawable balance yet, or amount below minimum.</Text>
        )}
      </Card>

      {/* Pending Paystack checkouts: resume or cancel */}
      {pendingFeeCheckouts.length > 0 ? (
        <Card style={styles.pendingCheckoutSection}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accent.amber + '30' }]}>
              <Ionicons name="time-outline" size={24} color={colors.accent.amber} />
            </View>
            <View style={styles.sectionTitleWrap}>
              <Text style={styles.sectionTitle}>Payment in progress</Text>
              <Text style={styles.sectionSubtitle}>
                You opened Paystack but did not finish. Continue the same session (same amount), or cancel it to start a
                new card payment.
              </Text>
            </View>
          </View>
          {pendingFeeCheckouts.map((p) => (
            <View key={p.id} style={styles.pendingCheckoutRow}>
              <View style={styles.pendingCheckoutMeta}>
                <Text style={styles.pendingCheckoutAmount}>₦{(p.amountNaira ?? p.amountMinor / 100).toLocaleString()}</Text>
                <Text style={styles.pendingCheckoutDate}>
                  Started{' '}
                  {new Date(p.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </Text>
                {p.description ? <Text style={styles.pendingCheckoutNote}>{p.description}</Text> : null}
              </View>
              <Button
                title="Continue payment"
                onPress={() => openContinuePlatformFeeCheckout(p)}
                disabled={
                  cancellingCheckoutId !== null ||
                  !p.authorizationUrl?.trim() ||
                  !p.paystackReference
                }
              />
              <Button
                title={cancellingCheckoutId === p.id ? 'Cancelling…' : 'Cancel checkout'}
                variant="outline"
                onPress={() => confirmCancelPlatformFeeCheckout(p)}
                loading={cancellingCheckoutId === p.id}
                disabled={cancellingCheckoutId !== null}
                style={styles.pendingCheckoutSecondBtn}
              />
            </View>
          ))}
        </Card>
      ) : null}

      {/* Pay platform fee (full owed balance only), Paystack */}
      {remainingUnpaidFeeMinor >= 100 ? (
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accent.amber + '25' }]}>
              <Ionicons name="card-outline" size={24} color={colors.accent.amber} />
            </View>
            <View style={styles.sectionTitleWrap}>
              <Text style={styles.sectionTitle}>Pay platform fee</Text>
              <Text style={styles.sectionSubtitle}>
                Pay your full outstanding 20% on direct-paid jobs with card (Paystack). Checkout opens in the app;
                we confirm as soon as Paystack succeeds.
              </Text>
            </View>
          </View>
          <Text style={styles.feeOwedLine}>
            Amount due: <Text style={styles.feeOwedAmount}>₦{unpaidFeeNairaDisplay.toLocaleString()}</Text>
          </Text>
          {blockedByPendingCheckout ? (
            <Text style={styles.pendingBlocksPayHint}>
              A checkout above is holding this payment slot. Continue that session or cancel it to pay the full balance
              here.
            </Text>
          ) : null}
          <Button
            title={payingPlatformFee ? 'Starting…' : `Pay ₦${unpaidFeeNairaDisplay.toLocaleString()} with card`}
            onPress={handlePayPlatformFee}
            loading={payingPlatformFee}
            disabled={blockedByPendingCheckout}
          />
        </Card>
      ) : null}

      {/* Transaction history */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary[100] }]}>
            <Ionicons name="list-outline" size={24} color={colors.primary[600]} />
          </View>
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionTitle}>Transaction history</Text>
            <Text style={styles.sectionSubtitle}>Tap a row for full detail and fee split</Text>
          </View>
        </View>
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions yet.</Text>
        ) : (
          transactions.map((t) => {
            const signed = txSignedAmount(t)
            return (
              <TouchableOpacity
                key={t.id}
                style={styles.txRow}
                onPress={() => openTxDetail(t.id)}
                activeOpacity={0.7}
              >
                <View style={styles.txLeft}>
                  <Text style={styles.txTitle}>{txTitle(t.type)}</Text>
                  <Text style={styles.txDate}>
                    {new Date(t.createdAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                    {t.type === 'USER_PAYMENT' && t.status === 'PENDING'
                      ? ', Payment pending confirmation'
                      : (t.type === 'MECHANIC_FEE' ||
                          t.type === 'PLATFORM_FEE_AUTO_SETTLEMENT' ||
                          t.type === 'AUTO_PLATFORM_FEE_SETTLEMENT' ||
                          t.type === 'FEE_SETTLEMENT') &&
                        t.status === 'PENDING'
                        ? ', Pending payment'
                        : t.type === 'PLATFORM_PAYOUT' && t.status === 'PENDING'
                          ? ', Processing'
                          : ''}
                  </Text>
                </View>
                <View style={styles.txRight}>
                  <Text
                    style={[
                      styles.txAmount,
                      signed.pending
                        ? { color: colors.neutral[500] }
                        : signed.outgoing
                          ? { color: colors.accent.amber }
                          : { color: colors.accent.green },
                    ]}
                  >
                    {signed.text}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} />
                </View>
              </TouchableOpacity>
            )
          })
        )}
      </Card>

      {/* Withdrawal account */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary[100] }]}>
            <Ionicons name="business" size={24} color={colors.primary[600]} />
          </View>
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionTitle}>Withdrawal account</Text>
            <Text style={styles.sectionSubtitle}>Withdrawals go to your default account</Text>
          </View>
          <Button
            title={showAddBank ? 'Cancel' : 'Add'}
            onPress={() => setShowAddBank((v) => !v)}
            variant={showAddBank ? 'outline' : 'primary'}
            style={styles.addBtn}
          />
        </View>

        {showAddBank && (
          <View style={styles.addForm}>
            <TouchableOpacity
              style={styles.pickerTouch}
              onPress={() => setShowBankPicker(true)}
            >
              <Text style={addForm.bankName ? styles.pickerText : styles.pickerPlaceholder}>
                {addForm.bankName || 'Select bank'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.neutral[500]} />
            </TouchableOpacity>
            <Input
              label="Account number"
              value={addForm.accountNumber}
              onChangeText={(t) => setAddForm((f) => ({ ...f, accountNumber: t.replace(/\D/g, '').slice(0, 15) }))}
              placeholder="10 digits"
              keyboardType="number-pad"
            />
            <Input
              label="Account name"
              value={addForm.accountName}
              onChangeText={(t) => setAddForm((f) => ({ ...f, accountName: t }))}
              placeholder="Name on account"
            />
            <Button title="Add account" onPress={handleAddBank} loading={submitting} />
          </View>
        )}

        {bankAccounts.length === 0 && !showAddBank && (
          <Text style={styles.emptyText}>No bank account added. Add one so we can pay you.</Text>
        )}
        {bankAccounts.map((acc) => (
          <View key={acc.id} style={styles.bankRow}>
            <View style={styles.bankInfo}>
              <Text style={styles.bankName}>{acc.bankName}</Text>
              <Text style={styles.bankDetail}>
                {acc.accountName}, {acc.accountNumber.replace(/(\d{4})(\d{4})(\d+)/, '$1****$3')}
              </Text>
            </View>
            <View style={styles.bankActions}>
              <TouchableOpacity onPress={() => openEditBank(acc)} style={styles.iconBtn}>
                <Ionicons name="pencil-outline" size={22} color={colors.primary[600]} />
              </TouchableOpacity>
              {!acc.isDefault && (
                <TouchableOpacity onPress={() => setDefault(acc.id)} style={styles.iconBtn}>
                  <Ionicons name="star-outline" size={22} color={colors.primary[600]} />
                </TouchableOpacity>
              )}
              {acc.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => deleteAccount(acc)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={22} color={colors.accent.red} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </Card>
    </ScrollView>

      <Modal visible={showBankPicker} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBankPicker(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Select bank</Text>
            <FlatList
              data={banks}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.bankOption}
                  onPress={() => {
                    setAddForm((f) => ({ ...f, bankCode: item.code, bankName: item.name }))
                    setShowBankPicker(false)
                  }}
                >
                  <Text style={styles.bankOptionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <Button title="Cancel" variant="outline" onPress={() => setShowBankPicker(false)} />
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={editingAccount !== null} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditingAccount(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Edit bank account</Text>
            <TouchableOpacity
              style={styles.pickerTouch}
              onPress={() => setShowEditBankPicker(true)}
            >
              <Text style={editForm.bankName ? styles.pickerText : styles.pickerPlaceholder}>
                {editForm.bankName || 'Select bank'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.neutral[500]} />
            </TouchableOpacity>
            <Input
              label="Account number"
              value={editForm.accountNumber}
              onChangeText={(t) => setEditForm((f) => ({ ...f, accountNumber: t.replace(/\D/g, '').slice(0, 15) }))}
              placeholder="10 digits"
              keyboardType="number-pad"
            />
            <Input
              label="Account name"
              value={editForm.accountName}
              onChangeText={(t) => setEditForm((f) => ({ ...f, accountName: t }))}
              placeholder="Name on account"
            />
            <Button title="Save" onPress={handleUpdateBank} loading={updatingBank} />
            <Button title="Cancel" variant="outline" onPress={() => setEditingAccount(null)} style={{ marginTop: 8 }} />
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showEditBankPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowEditBankPicker(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Select bank</Text>
            <FlatList
              data={banks}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.bankOption}
                  onPress={() => {
                    setEditForm((f) => ({ ...f, bankCode: item.code, bankName: item.name }))
                    setShowEditBankPicker(false)
                  }}
                >
                  <Text style={styles.bankOptionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <Button title="Cancel" variant="outline" onPress={() => setShowEditBankPicker(false)} />
          </View>
        </TouchableOpacity>
      </Modal>

      <PaystackCheckoutModal
        visible={Boolean(paystackFeeUrl && paystackFeeRef)}
        authorizationUrl={paystackFeeUrl}
        expectedReference={paystackFeeRef}
        title="Pay platform fee"
        onRequestClose={() => {
          setPaystackFeeUrl(null)
          setPaystackFeeRef(null)
        }}
        verifyPayment={(reference) => walletAPI.verifyMechanicFeePayment(reference)}
        onVerified={async () => {
          pendingFeePaystackRef.current = null
          await loadData()
          Alert.alert('Payment successful', 'Your platform fee payment was received.')
        }}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 20 },
  balanceCard: { marginBottom: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardLabelRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  cardLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500', flexShrink: 1 },
  heroAmount: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  balanceMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  balanceMetaNote: { fontSize: 12, color: colors.neutral[500], marginTop: 6, lineHeight: 17 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  txLeft: { flex: 1, minWidth: 0, paddingRight: 8 },
  txRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  txTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  txDate: { fontSize: 12, color: colors.neutral[500], marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  sectionTitleWrap: { flex: 1, minWidth: 120 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  sectionSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  feeOwedLine: { fontSize: 15, color: colors.textSecondary, marginBottom: 14 },
  feeOwedAmount: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  pendingCheckoutSection: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.accent.amber + '55',
    backgroundColor: colors.accent.amber + '0c',
  },
  pendingCheckoutRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  pendingCheckoutMeta: { marginBottom: 12 },
  pendingCheckoutAmount: { fontSize: 20, fontWeight: '800', color: colors.text },
  pendingCheckoutDate: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  pendingCheckoutNote: { fontSize: 12, color: colors.neutral[600], marginTop: 6, lineHeight: 17 },
  pendingCheckoutSecondBtn: { marginTop: 10 },
  pendingBlocksPayHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 19,
  },
  withdrawDestination: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.primary[50],
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  withdrawDestinationText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  withdrawDestinationStrong: { fontWeight: '700', color: colors.text },
  withdrawWarning: {
    fontSize: 13,
    color: colors.accent.amber,
    marginBottom: 12,
    lineHeight: 19,
  },
  withdrawPendingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.primary[100],
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  withdrawPendingText: { flex: 1, fontSize: 13, color: colors.primary[900], lineHeight: 19 },
  withdrawAvailableLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
  withdrawAvailableAmount: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  quickWithdrawRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  quickWithdrawChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  quickWithdrawChipText: { fontSize: 14, fontWeight: '600', color: colors.primary[700] },
  addBtn: { alignSelf: 'flex-start' },
  addForm: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[200], gap: 0 },
  pickerTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: colors.surface,
  },
  pickerText: { fontSize: 16, color: colors.text },
  pickerPlaceholder: { fontSize: 16, color: colors.neutral[400] },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  bankInfo: { flex: 1, minWidth: 0 },
  bankName: { fontSize: 15, fontWeight: '600', color: colors.text },
  bankDetail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  bankActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 8 },
  defaultBadge: { backgroundColor: colors.primary[100], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  defaultBadgeText: { fontSize: 12, fontWeight: '600', color: colors.primary[700] },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  bankOption: { paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  bankOptionText: { fontSize: 16, color: colors.text },
})
