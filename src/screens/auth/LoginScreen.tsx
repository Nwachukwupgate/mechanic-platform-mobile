import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { authAPI, getApiErrorMessage } from '../../services/api'
import { validateLogin } from '../../utils/validation'
import { useAuthStore } from '../../store/authStore'
import { colors } from '../../theme/colors'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Card } from '../../components/Card'
import { MapBackground } from '../../components/MapBackground'

export function LoginScreen({ navigation }: { navigation: any }) {
  const [role, setRole] = useState<'USER' | 'MECHANIC'>('USER')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setAuth = useAuthStore((s) => s.setAuth)

  const handleLogin = async () => {
    const validation = validateLogin(email, password)
    if (!validation.valid) {
      setError(validation.message)
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = role === 'USER'
        ? await authAPI.loginUser(email.trim(), password)
        : await authAPI.loginMechanic(email.trim(), password)
      const user = res.data.user
      const token = res.data.access_token
      if (!user || !token) {
        setError('Invalid response from server')
        return
      }
      if (!user.role) user.role = role
      await setAuth(user, token)
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <MapBackground variant="light" style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
          <Ionicons name="construct" size={48} color={colors.primary[600]} />
          <Text style={styles.title}>Mechanic Platform</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>
        <Card>
          <View style={styles.roleRow}>
            <Button
              title="User"
              onPress={() => { setRole('USER'); setError('') }}
              variant={role === 'USER' ? 'primary' : 'outline'}
              style={styles.roleBtn}
            />
            <Button
              title="Mechanic"
              onPress={() => { setRole('MECHANIC'); setError('') }}
              variant={role === 'MECHANIC' ? 'primary' : 'outline'}
              style={styles.roleBtn}
            />
          </View>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />
          {error ? <Text style={styles.errText}>{error}</Text> : null}
          <Button title="Sign in" onPress={handleLogin} loading={loading} />
        </Card>
        <Button
          title="Create an account"
          onPress={() => navigation.replace('Register')}
          variant="outline"
          style={styles.registerBtn}
        />
        </ScrollView>
      </KeyboardAvoidingView>
    </MapBackground>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  scroll: { padding: 24, paddingTop: 48 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 12 },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 4 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  roleBtn: { flex: 1 },
  errText: { color: colors.accent.red, fontSize: 14, marginBottom: 12 },
  registerBtn: { marginTop: 16 },
})
