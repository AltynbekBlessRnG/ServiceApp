import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@rneui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'confirm';

interface ToastOptions {
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

let globalShowToast: ((opts: ToastOptions) => void) | null = null;

export function showToast(opts: ToastOptions) {
  globalShowToast?.(opts);
}

const ICONS: Record<ToastType, { name: string; color: string; bg: string }> = {
  success: { name: 'check-circle', color: '#26CF87', bg: 'rgba(38,207,135,0.12)' },
  error: { name: 'x-circle', color: '#F6465D', bg: 'rgba(246,70,93,0.12)' },
  warning: { name: 'alert-triangle', color: '#F0B90B', bg: 'rgba(240,185,11,0.12)' },
  info: { name: 'info', color: '#1E88E5', bg: 'rgba(30,136,229,0.12)' },
  confirm: { name: 'help-circle', color: '#F0B90B', bg: 'rgba(240,185,11,0.12)' },
};

export function ToastProvider() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastOptions & { visible: boolean }>({
    visible: false, title: '', type: 'info',
  });
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-80)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -80, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast((prev) => ({ ...prev, visible: false })));
  }, [opacity, translateY]);

  useEffect(() => {
    globalShowToast = (opts: ToastOptions) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      opacity.setValue(0);
      translateY.setValue(-80);
      setToast({ ...opts, visible: true });

      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, damping: 15, stiffness: 150, useNativeDriver: true }),
      ]).start();

      if (!opts.onConfirm) {
        timerRef.current = setTimeout(() => dismiss(), opts.duration || 3000);
      }
    };
    return () => { globalShowToast = null; };
  }, [dismiss, opacity, translateY]);

  if (!toast.visible) return null;

  const icon = ICONS[toast.type || 'info'];
  const isConfirm = toast.type === 'confirm' && toast.onConfirm;

  return (
    <Animated.View style={[styles.container, { top: insets.top + 10, opacity, transform: [{ translateY }] }]}>
      <View style={styles.card}>
        <View style={[styles.iconBox, { backgroundColor: icon.bg }]}>
          <Icon name={icon.name} type="feather" size={22} color={icon.color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>{toast.title}</Text>
          {toast.message && <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>}
          {isConfirm && (
            <View style={styles.buttonRow}>
              <TouchableOpacity onPress={() => { toast.onCancel?.(); dismiss(); }} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>{toast.cancelText || 'Отмена'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { toast.onConfirm?.(); dismiss(); }} style={styles.confirmBtn}>
                <Text style={styles.confirmText}>{toast.confirmText || 'Подтвердить'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {!isConfirm && (
          <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="x" type="feather" size={16} color="#5E6673" />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

export function AlertAsync({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  type = 'warning',
}: {
  visible: boolean;
  title: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: ToastType;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
  }, [opacity, visible]);

  if (!visible) return null;

  const icon = ICONS[type];

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <TouchableOpacity style={styles.overlayTouch} onPress={onCancel} activeOpacity={1} />
      <View style={styles.alertCard}>
        <View style={[styles.alertIconBox, { backgroundColor: icon.bg }]}>
          <Icon name={icon.name} type="feather" size={32} color={icon.color} />
        </View>
        <Text style={styles.alertTitle}>{title}</Text>
        {message && <Text style={styles.alertMessage}>{message}</Text>}
        <View style={styles.alertButtons}>
          <TouchableOpacity onPress={onCancel} style={styles.alertCancelBtn}>
            <Text style={styles.alertCancelText}>{cancelText}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onConfirm} style={[styles.alertConfirmBtn, { backgroundColor: icon.color }]}>
            <Text style={styles.alertConfirmText}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2329',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2B3139',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: { flex: 1 },
  title: { color: '#FAFAFA', fontSize: 14, fontWeight: '700' },
  message: { color: '#848E9C', fontSize: 12, marginTop: 2, lineHeight: 16 },
  buttonRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
  cancelBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#2B3139', alignItems: 'center' },
  cancelText: { color: '#848E9C', fontSize: 13, fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F0B90B', alignItems: 'center' },
  confirmText: { color: '#0B0E11', fontSize: 13, fontWeight: '700' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, justifyContent: 'center', alignItems: 'center' },
  overlayTouch: { ...StyleSheet.absoluteFillObject },
  alertCard: {
    width: SCREEN_WIDTH - 48,
    backgroundColor: '#1E2329',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2B3139',
  },
  alertIconBox: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  alertTitle: { color: '#FAFAFA', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  alertMessage: { color: '#848E9C', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  alertButtons: { flexDirection: 'row', marginTop: 24, gap: 12, width: '100%' },
  alertCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#2B3139', alignItems: 'center' },
  alertCancelText: { color: '#848E9C', fontSize: 15, fontWeight: '700' },
  alertConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  alertConfirmText: { color: '#0B0E11', fontSize: 15, fontWeight: '700' },
});
