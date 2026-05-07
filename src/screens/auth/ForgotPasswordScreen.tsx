import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image, TouchableOpacity } from 'react-native'
import { authAPI, getApiErrorMessage } from '../../services/api'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Card } from '../../components/Card'
import { MapBackground } from '../../components/MapBackground'

export function ForgotPasswordScreen({ navigation }: { navigation: any }) {
  const [role, setRole] = useState<'USER' | 'MECHANIC'>('USER')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sendCode = async () => {
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address')
      return
    }
    setError('')
    setLoading(true)
    try {
      await authAPI.forgotPassword({ email: trimmed, role })
      navigation.navigate('ResetPassword', { email: trimmed, role })
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not send code'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <MapBackground variant="light" style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backWrap} onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={styles.backText}>← Back to sign in</Text>
          </TouchableOpacity>
          <View style={styles.header}>
            <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Reset password</Text>
            <Text style={styles.subtitle}>
              We&apos;ll email a 6-digit code. Enter it on the next screen with your new password.
            </Text>
          </View>
          <Card>
            <View style={styles.roleRow}>
              <Button
                title="User"
                onPress={() => { setRole('USER'); setError('') }}
                variant={role === 'USER' ? 'primary' : 'outline'}
                hugContent={role === 'USER'}
              />
              <Button
                title="Mechanic"
                onPress={() => { setRole('MECHANIC'); setError('') }}
                variant={role === 'MECHANIC' ? 'primary' : 'outline'}
                hugContent={role === 'MECHANIC'}
              />
            </View>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="you@example.com"
            />
            {error ? <Text style={styles.errText}>{error}</Text> : null}
            <Button title="Send code" onPress={sendCode} loading={loading} />
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
  logo: { width: 64, height: 64, marginBottom: 8 },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 10, textAlign: 'center', lineHeight: 22 },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  errText: { color: colors.accent.red, fontSize: 14, marginBottom: 12 },
})
