import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, useNavigation } from '@react-navigation/native'
import { authAPI, getApiErrorMessage } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { colors } from '../../theme/colors'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'

type RouteParams = { token?: string; role?: string }

export function VerifyEmailScreen() {
  const route = useRoute()
  const navigation = useNavigation<any>()
  const params = (route.params || {}) as RouteParams
  const token = params.token ?? ''
  const role = (params.role ?? 'USER').toUpperCase() as 'USER' | 'MECHANIC'

  const [state, setState] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading')
  const [message, setMessage] = useState('')
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    if (!token || !role) {
      setState('invalid')
      setMessage('Invalid verification link. Missing token or role.')
      return
    }
    let cancelled = false
    authAPI
      .verifyEmail(token, role)
      .then((res) => {
        if (cancelled) return
        const user = res.data?.user
        const accessToken = res.data?.access_token
        if (user && accessToken) {
          if (!user.role) user.role = role
          setAuth(user, accessToken)
          setState('success')
          setMessage('Email verified! You are now signed in.')
        } else {
          setState('success')
          setMessage('Email verified. You can now sign in.')
        }
      })
      .catch((err) => {
        if (cancelled) return
        const msg = getApiErrorMessage(err, 'Verification failed.')
        if (msg.toLowerCase().includes('invalid') || err.response?.status === 400) {
          setState('invalid')
          setMessage('This verification link is invalid or has expired.')
        } else {
          setState('error')
          setMessage(msg)
        }
      })
    return () => { cancelled = true }
  }, [token, role])

  if (state === 'loading') {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
          <Text style={styles.loadingText}>Verifying your email…</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={state === 'success' ? 'checkmark-circle' : state === 'invalid' ? 'link' : 'alert-circle'}
            size={64}
            color={state === 'success' ? colors.accent.green : state === 'invalid' ? colors.neutral[500] : colors.accent.red}
          />
        </View>
        <Text style={styles.title}>
          {state === 'success' ? 'Verified' : state === 'invalid' ? 'Invalid link' : 'Verification failed'}
        </Text>
        <Text style={styles.message}>{message}</Text>
        <Card style={styles.card}>
          <Button
            title={state === 'success' ? 'Continue' : 'Back to sign in'}
            onPress={() => {
              if (state === 'success' && useAuthStore.getState().isAuthenticated) {
                navigation.reset({ index: 0, routes: [{ name: 'Main' }] })
              } else {
                navigation.replace('Login')
              }
            }}
          />
        </Card>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center' },
  center: { alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 16, fontSize: 16, color: colors.textSecondary },
  iconWrap: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
  message: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  card: { width: '100%', maxWidth: 320 },
})
