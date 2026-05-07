import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native'
import { authAPI, getApiErrorMessage } from '../../services/api'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Card } from '../../components/Card'
import { MapBackground } from '../../components/MapBackground'

const RESEND_COOLDOWN_SEC = 60

type Params = { email: string; role: 'USER' | 'MECHANIC' }

export function ResetPasswordScreen({ navigation, route }: { navigation: any; route: any }) {
  const params = route?.params as Params | undefined
  const email = params?.email ?? ''
  const role = params?.role ?? 'USER'

  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC)

  useEffect(() => {
    if (!email) {
      navigation.replace('ForgotPassword')
    }
  }, [email, navigation])

  useEffect(() => {
    const t = setInterval(() => {
      setCooldown((c) => (c <= 0 ? 0 : c - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const resend = useCallback(async () => {
    if (cooldown > 0 || !email) return
    setResendLoading(true)
    setError('')
    try {
      await authAPI.forgotPassword({ email, role })
      setCooldown(RESEND_COOLDOWN_SEC)
      Alert.alert('Code sent', 'Check your email for a new 6-digit code.')
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not resend code'))
    } finally {
      setResendLoading(false)
    }
  }, [email, role, cooldown])

  const submit = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from your email')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setLoading(true)
    try {
      await authAPI.resetPassword({
        email,
        role,
        code: code.trim(),
        newPassword: password,
      })
      Alert.alert('Success', 'Your password was updated. Sign in with your new password.', [
        { text: 'OK', onPress: () => navigation.replace('Login') },
      ])
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not reset password'))
    } finally {
      setLoading(false)
    }
  }

  if (!email) {
    return null
  }

  return (
    <MapBackground variant="light" style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backWrap} onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.header}>
            <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Enter code</Text>
            <Text style={styles.subtitle}>
              We sent a code to{' '}
              <Text style={styles.emailStrong}>{email}</Text>. It expires in 15 minutes.
            </Text>
          </View>
          <Card>
            <Text style={styles.otpLabel}>6-digit code</Text>
            <TextInput
              style={styles.otpInput}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="• • • • • •"
              placeholderTextColor={colors.neutral[400]}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
            />
            <TouchableOpacity
              style={[styles.resendBtn, (cooldown > 0 || resendLoading) && styles.resendDisabled]}
              onPress={() => void resend()}
              disabled={cooldown > 0 || resendLoading}
            >
              <Text style={[styles.resendText, (cooldown > 0 || resendLoading) && styles.resendTextDisabled]}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : resendLoading ? 'Sending…' : 'Resend code'}
              </Text>
            </TouchableOpacity>
            <Input
              label="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              showPasswordToggle
              placeholder="At least 6 characters"
            />
            <Input
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              showPasswordToggle
              placeholder="Repeat password"
            />
            {error ? <Text style={styles.errText}>{error}</Text> : null}
            <Button title="Update password" onPress={submit} loading={loading} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </MapBackground>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  scroll: { padding: 24, paddingTop: 40 },
  backWrap: { alignSelf: 'flex-start', marginBottom: 16 },
  backText: { ...typography.body, color: colors.primary[600], fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 56, height: 56, marginBottom: 8 },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 10, textAlign: 'center', lineHeight: 22 },
  emailStrong: { color: colors.text, fontWeight: '600' },
  otpLabel: { ...typography.body, fontWeight: '600', color: colors.text, marginBottom: 8 },
  otpInput: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 26,
    letterSpacing: 10,
    textAlign: 'center',
    color: colors.text,
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  resendBtn: { alignSelf: 'center', paddingVertical: 8, marginBottom: 16 },
  resendDisabled: { opacity: 0.55 },
  resendText: { ...typography.body, color: colors.primary[600], fontWeight: '600' },
  resendTextDisabled: { color: colors.textSecondary },
  errText: { color: colors.accent.red, fontSize: 14, marginBottom: 12 },
})
