import React, { useState, useCallback, useRef } from 'react'
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
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { walletAPI, mechanicsAPI } from '../../services/api'
import { getApiErrorMessage } from '../../services/api'
import { colors } from '../../theme/colors'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { LoadingOverlay } from '../../components/LoadingOverlay'

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
  currency: string
}

export function MechanicWalletScreen() {
  const navigation = useNavigation()
  const initialLoadDone = useRef(false)
  const [summary, setSummary] = useState<{
    balance: WalletSummaryBalance
    recentTransactions: any[]
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
  const [feeAmount, setFeeAmount] = useState('')
  const [feeBookingId, setFeeBookingId] = useState('')
  const [feeNote, setFeeNote] = useState('')
  const [recordingFee, setRecordingFee] = useState(false)

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

  useFocusEffect(
    useCallback(() => {
      const first = !initialLoadDone.current
      initialLoadDone.current = true
      void runLoad(first)
    }, [runLoad])
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
    Alert.alert('Remove account', `Remove ${acc.bankName} · ${acc.accountNumber}?`, [
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
  const netNaira = bal?.netNaira ?? 0
  const availableMinor = bal?.availableToWithdrawMinor ?? 0
  const unpaidFeeNaira = bal?.unpaidPlatformFeeNaira ?? 0

  const handleWithdraw = async () => {
    const naira = parseFloat(withdrawAmount)
    if (!Number.isFinite(naira) || naira < 1) {
      Alert.alert('Error', 'Enter a valid amount (min ₦1)')
      return
    }
    const amountMinor = Math.round(naira * 100)
    if (amountMinor > availableMinor) {
      Alert.alert('Error', 'Amount exceeds withdrawable balance (platform-paid earnings)')
      return
    }
    setWithdrawing(true)
    try {
      await walletAPI.withdraw(amountMinor)
      setWithdrawAmount('')
      loadData()
      Alert.alert('Success', `₦${naira.toLocaleString()} sent to your bank account`)
    } catch (e: any) {
      Alert.alert('Withdrawal failed', getApiErrorMessage(e, 'Could not complete withdrawal'))
    } finally {
      setWithdrawing(false)
    }
  }

  const handleRecordFee = async () => {
    const naira = parseFloat(feeAmount)
    if (!Number.isFinite(naira) || naira < 1) {
      Alert.alert('Error', 'Enter a valid fee amount (min ₦1)')
      return
    }
    const amountMinor = Math.round(naira * 100)
    setRecordingFee(true)
    try {
      await walletAPI.recordFeePayment({
        amountMinor,
        bookingId: feeBookingId.trim() || undefined,
        note: feeNote.trim() || undefined,
      })
      setFeeAmount('')
      setFeeBookingId('')
      setFeeNote('')
      loadData()
      Alert.alert('Success', 'Platform fee payment recorded.')
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e, 'Could not record payment'))
    } finally {
      setRecordingFee(false)
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
      case 'REFUND':
        return 'Refund'
      default:
        return type.replace(/_/g, ' ')
    }
  }

  const txSignedAmount = (t: { type: string; amountNaira: number }) => {
    const n = t.amountNaira ?? 0
    if (t.type === 'PLATFORM_PAYOUT' || t.type === 'MECHANIC_FEE') {
      return { text: `-${'\u20A6'}${n.toLocaleString()}`, outgoing: true }
    }
    return { text: `+${'\u20A6'}${n.toLocaleString()}`, outgoing: false }
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
          <Text style={styles.cardLabel}>Your balance</Text>
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
          Withdrawable (80% from platform-paid jobs): ₦{(bal?.availableToWithdrawNaira ?? 0).toLocaleString()}
        </Text>
        <Text style={styles.balanceMeta}>
          Unpaid platform fees (20% on direct jobs): ₦{unpaidFeeNaira.toLocaleString()}
        </Text>
        <Text style={styles.balanceHint}>
          Net balance is withdrawable earnings minus fees you still owe. It can be negative if fees exceed accrued
          payouts.
        </Text>
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
              From platform-paid jobs only (your 80% share after our 20% fee)
            </Text>
          </View>
        </View>
        <Input
          label="Amount (₦)"
          value={withdrawAmount}
          onChangeText={setWithdrawAmount}
          placeholder="0"
          keyboardType="decimal-pad"
        />
        <Button
          title={withdrawing ? 'Sending…' : 'Withdraw'}
          onPress={handleWithdraw}
          loading={withdrawing}
          disabled={availableMinor < 100}
        />
        {availableMinor < 100 && (
          <Text style={styles.emptyText}>No withdrawable balance yet, or amount below minimum.</Text>
        )}
      </Card>

      {/* Record platform fee (direct jobs) */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accent.amber + '25' }]}>
            <Ionicons name="cash-outline" size={24} color={colors.accent.amber} />
          </View>
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionTitle}>Record platform fee</Text>
            <Text style={styles.sectionSubtitle}>
              Customer paid you directly? Log the 20% platform fee here to keep your ledger accurate.
            </Text>
          </View>
        </View>
        <Input
          label="Amount paid to platform (₦)"
          value={feeAmount}
          onChangeText={setFeeAmount}
          placeholder="0"
          keyboardType="decimal-pad"
        />
        <Input
          label="Booking ID (optional)"
          value={feeBookingId}
          onChangeText={setFeeBookingId}
          placeholder="Link to a direct-paid job"
          autoCapitalize="none"
        />
        <Input
          label="Note (optional)"
          value={feeNote}
          onChangeText={setFeeNote}
          placeholder="e.g. Transfer reference"
        />
        <Button
          title={recordingFee ? 'Saving…' : 'Record fee payment'}
          onPress={handleRecordFee}
          loading={recordingFee}
        />
      </Card>

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
                  </Text>
                </View>
                <View style={styles.txRight}>
                  <Text
                    style={[
                      styles.txAmount,
                      signed.outgoing ? { color: colors.accent.amber } : { color: colors.accent.green },
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
                {acc.accountName} · {acc.accountNumber.replace(/(\d{4})(\d{4})(\d+)/, '$1****$3')}
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
  cardLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  heroAmount: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  balanceMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  balanceHint: { fontSize: 12, color: colors.neutral[500], marginTop: 10, lineHeight: 18 },
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
