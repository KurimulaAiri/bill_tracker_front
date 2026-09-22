import { ref, onUnmounted } from 'vue';

/** 移动端判定：跟随窗口宽度变化（< 768px 视为移动端），组件卸载时自动清理监听 */
export function useMobile() {
  const mq = window.matchMedia('(max-width: 767px)');
  const isMobile = ref(mq.matches);
  const onChange = (e: MediaQueryListEvent) => {
    isMobile.value = e.matches;
  };
  mq.addEventListener('change', onChange);
  onUnmounted(() => mq.removeEventListener('change', onChange));
  return { isMobile };
}