import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, NativeModules, Image } from 'react-native';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../store';

const getApiUrl = () => {
  const scriptURL = NativeModules.SourceCode?.scriptURL || '';
  if (scriptURL) {
    const address = scriptURL.split('://')[1];
    const host = address ? address.split(':')[0] : null;
    if (host) return `http://${host}:5000/api`;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : `\${API_BASE_URL}`;
};

const API_URL = getApiUrl();

export default 
const BASE_URL = __DEV__ ? 'http://localhost:5000' : 'https://mech-bazaar-backend.vercel.app';
const API_BASE_URL = `${BASE_URL}/api`;

function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const dispatch = useDispatch();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('customer@mechbazar.com');
  const [password, setPassword] = useState('Password@123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleAuth = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (isRegisterMode) {
      if (!name || !phone || !email || !password) {
        setErrorMessage('All fields are required');
        return;
      }
    } else {
      if (!email || !password) {
        setErrorMessage('Please enter email and password');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isRegisterMode) {
        // Register User
        const response = await axios.post(`${API_URL}/auth/register`, {
          email,
          phone,
          name,
          password,
          role: 'CUSTOMER'
        });

        setSuccessMessage('Registration successful! Please sign in.');
        setIsRegisterMode(false);
        setIsLoading(false);
      } else {
        // Login User
        const response = await axios.post(`${API_URL}/auth/login`, {
          email,
          password,
        });

        if (response.data && response.data.success && response.data.data) {
          dispatch(loginSuccess({
            token: response.data.data.token,
            user: response.data.data.user,
          }));
          onLoginSuccess();
        } else {
          setErrorMessage('Invalid credentials');
        }
      }
    } catch (error: any) {
      console.error('Authentication request failed:', error.message);
      setErrorMessage(
        error.response?.data?.message || 
        'Network Connection Error. Make sure the backend server is running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/logo.png')} style={{ height: 40, width: 180, resizeMode: 'contain', alignSelf: 'center', marginBottom: 10 }} />
            <Text style={styles.logoTagline}>Automotive Spare Parts in 10 Mins</Text>
          </View>

          <Text style={styles.title}>{isRegisterMode ? 'Create Account' : 'Sign In'}</Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {isRegisterMode && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#64748B"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+91 99999 99999"
                  placeholderTextColor="#64748B"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              placeholderTextColor="#64748B"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>{isRegisterMode ? 'Register' : 'Sign In'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.toggleButton} 
            onPress={() => {
              setIsRegisterMode(!isRegisterMode);
              setErrorMessage('');
              setSuccessMessage('');
            }}
          >
            <Text style={styles.toggleButtonText}>
              {isRegisterMode ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>

          {!isRegisterMode && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>Test Credentials:</Text>
              <Text style={styles.credentials}>customer@mechbazar.com / Password@123</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F8FAFC',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#facc15',
    letterSpacing: 2,
  },
  logoTagline: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: '#7f1d1d',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#b91c1c',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: '#064e3b',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#059669',
  },
  successText: {
    color: '#a7f3d0',
    fontSize: 13,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    color: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loginButton: {
    backgroundColor: '#facc15',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#facc15',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  toggleButtonText: {
    color: '#facc15',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 16,
  },
  footerText: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 2,
  },
  credentials: {
    color: '#facc15',
    fontSize: 12,
    fontWeight: '600',
  },
});
