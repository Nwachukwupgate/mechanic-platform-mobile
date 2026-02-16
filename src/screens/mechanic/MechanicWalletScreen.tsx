import React, { useState, useEffect } from 'react'
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

export function MechanicWalletScreen() {
  const [summary, setSummary] = useState<{
    balance: { balanceNaira: number; balanceMinor: number }
    owing: { owingNaira: number }
    recentTransactions: any[]
  } | null>(null)
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

  const loadData = () => {
    return Promise.all([
      walletAPI.getSummary().then((r) => setSummary(r.data)).catch(() => setSummary(null)),
      mechanicsAPI.listBankAccounts().then((r) => setBankAccounts(r.data)).catch(() => setBankAccounts([])),
      walletAPI.getBanks().then((r) => setBanks(r.data)).catch(() => setBanks([])),
    ])
  }

  useEffect(() => {
    setLoading(true)
    loadData().finally(() => setLoading(false))
  }, [])

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

  const balance = summary?.balance ?? { balanceNaira: 0, balanceMinor: 0 }
  const owing = summary?.owing ?? { owingNaira: 0 }

  const handleWithdraw = async () => {
    const naira = parseFloat(withdrawAmount)
    if (!Number.isFinite(naira) || naira < 1) {
      Alert.alert('Error', 'Enter a valid amount (min ₦1)')
      return
    }
    const amountMinor = Math.round(naira * 100)
    if (amountMinor > (balance.balanceMinor ?? 0)) {
      Alert.alert('Error', 'Amount exceeds your balance')
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

  if (loading) return <LoadingOverlay />

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Wallet</Text>
      <Text style={styles.subtitle}>Balance, payouts, and withdrawal account</Text>

      <View style={styles.cardsRow}>
        <Card style={styles.halfCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accent.green + '20' }]}>
              <Ionicons name="wallet" size={24} color={colors.accent.green} />
            </View>
            <Text style={styles.cardLabel}>Platform owes you</Text>
          </View>
          <Text style={[styles.amount, { color: colors.accent.green }]}>
            ₦{(balance.balanceNaira ?? 0).toLocaleString()}
          </Text>
        </Card>
        <Card style={styles.halfCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accent.amber + '20' }]}>
              <Ionicons name="alert-circle" size={24} color={colors.accent.amber} />
            </View>
            <Text style={styles.cardLabel}>You owe platform</Text>
          </View>
          <Text style={[styles.amount, { color: colors.accent.amber }]}>
            ₦{(owing.owingNaira ?? 0).toLocaleString()}
          </Text>
        </Card>
      </View>

      {/* Withdraw to bank */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accent.green + '20' }]}>
            <Ionicons name="arrow-down-circle" size={24} color={colors.accent.green} />
          </View>
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionTitle}>Withdraw to bank</Text>
            <Text style={styles.sectionSubtitle}>Send balance to your default account</Text>
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
          disabled={(balance.balanceMinor ?? 0) < 100}
        />
        {(balance.balanceMinor ?? 0) < 100 && (
          <Text style={styles.emptyText}>Add a default bank account below. Min withdrawal ₦1.</Text>
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
  cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  halfCard: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  amount: { fontSize: 20, fontWeight: '700' },
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
