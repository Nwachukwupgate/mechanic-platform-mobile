import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { authAPI, getApiErrorMessage } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { colors } from '../../theme/colors'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Card } from '../../components/Card'
import { MapBackground } from '../../components/MapBackground'

export function RegisterScreen({ navigation }: { navigation: any }) {
  const [role, setRole] = useState<'USER' | 'MECHANIC'>('USER')
  const [userForm, setUserForm] = useState({ firstName: '', lastName: '', email: '', dateOfBirth: '', password: '' })
  const [mechanicForm, setMechanicForm] = useState({ companyName: '', ownerFullName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const setAuth = useAuthStore((s) => s.setAuth)

  const handleRegisterUser = async () => {
    const { firstName, lastName, email, dateOfBirth, password } = userForm
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !dateOfBirth || !password) {
      setError('Please fill all fields')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setError('')
    setLoading(true)
    try {
      await authAPI.registerUser({ firstName, lastName, email, dateOfBirth, password })
      setSuccessMessage('Registration successful! Please check your email to verify your account before signing in.')
      setTimeout(() => navigation.replace('Login'), 3200)
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterMechanic = async () => {
    const { companyName, ownerFullName, email, password } = mechanicForm
    if (!companyName.trim() || !ownerFullName.trim() || !email.trim() || !password) {
      setError('Please fill all fields')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setError('')
    setLoading(true)
    try {
      await authAPI.registerMechanic({ companyName, ownerFullName, email, password })
      setSuccessMessage('Registration successful! Please check your email to verify your account before signing in.')
      setTimeout(() => navigation.replace('Login'), 3200)
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <MapBackground variant="light" style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Sign up</Text>
        <View style={styles.roleRow}>
          <Button title="User" onPress={() => { setRole('USER'); setError('') }} variant={role === 'USER' ? 'primary' : 'outline'} style={styles.roleBtn} />
          <Button title="Mechanic" onPress={() => { setRole('MECHANIC'); setError('') }} variant={role === 'MECHANIC' ? 'primary' : 'outline'} style={styles.roleBtn} />
        </View>
        <Card>
          {role === 'USER' ? (
            <>
              <Input label="First name" value={userForm.firstName} onChangeText={(t) => setUserForm((f) => ({ ...f, firstName: t }))} placeholder="John" />
              <Input label="Last name" value={userForm.lastName} onChangeText={(t) => setUserForm((f) => ({ ...f, lastName: t }))} placeholder="Doe" />
              <Input label="Email" value={userForm.email} onChangeText={(t) => setUserForm((f) => ({ ...f, email: t }))} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
              <Input label="Date of birth" value={userForm.dateOfBirth} onChangeText={(t) => setUserForm((f) => ({ ...f, dateOfBirth: t }))} placeholder="YYYY-MM-DD" />
              <Input label="Password" value={userForm.password} onChangeText={(t) => setUserForm((f) => ({ ...f, password: t }))} secureTextEntry placeholder="Min 6 characters" />
            </>
          ) : (
            <>
              <Input label="Company name" value={mechanicForm.companyName} onChangeText={(t) => setMechanicForm((f) => ({ ...f, companyName: t }))} placeholder="Your Garage" />
              <Input label="Owner full name" value={mechanicForm.ownerFullName} onChangeText={(t) => setMechanicForm((f) => ({ ...f, ownerFullName: t }))} placeholder="John Doe" />
              <Input label="Email" value={mechanicForm.email} onChangeText={(t) => setMechanicForm((f) => ({ ...f, email: t }))} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
              <Input label="Password" value={mechanicForm.password} onChangeText={(t) => setMechanicForm((f) => ({ ...f, password: t }))} secureTextEntry placeholder="Min 6 characters" />
            </>
          )}
          {successMessage ? (
            <Text style={styles.successText}>{successMessage}</Text>
          ) : error ? (
            <Text style={styles.errText}>{error}</Text>
          ) : null}
          <Button
            title="Create account"
            onPress={role === 'USER' ? handleRegisterUser : handleRegisterMechanic}
            loading={loading}
          />
        </Card>
        <Button title="Already have an account? Sign in" onPress={() => navigation.replace('Login')} variant="outline" style={styles.loginBtn} />
        </ScrollView>
      </KeyboardAvoidingView>
    </MapBackground>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  scroll: { padding: 24, paddingTop: 48, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 16 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  roleBtn: { flex: 1 },
  errText: { color: colors.accent.red, fontSize: 14, marginBottom: 12 },
  successText: { color: colors.accent.green, fontSize: 14, marginBottom: 12 },
  loginBtn: { marginTop: 16 },
})
