# k8s-манифесты для namespace `app-dotflat`

CI-пайплайн (`.gitlab-ci.yml`) делает только `kubectl set image` — создание и
конфигурация объектов кластера остаются вне CI и применяются вручную
человеком с правами (админ кластера / владелец `K3SDEVCONFIG` /
`K3SPRODCONFIG`).

У роли `developer` прав на `create services` и `patch secrets` нет
(проверено: `Error from server (Forbidden)`).

## Когда и что применять

### 1. Service `watcher` — разово

Без него nginx отдаёт 503 на `/api/worker/*` → фронт не видит блок-вотчер.

```bash
kubectl apply -f k8s/watcher-service.yaml
kubectl -n app-dotflat get endpoints watcher   # должен быть непустым
```

Если `endpoints watcher` пустой — значит селектор `app=watcher` не совпадает
с реальным лейблом пода. Посмотреть лейблы:

```bash
kubectl -n app-dotflat get pods --show-labels | grep watcher
```

И поправить `spec.selector` в манифесте под них.

### 2. REDIS_URL в секрете `watcher-env` — разово

Сейчас там `redis://redis:6379`, а Service `redis` в namespace `app-dotflat`
нет — наш Redis живёт в соседнем namespace `dotflat`. Правильное значение:

```
redis://redis.dotflat.svc.cluster.local:6379
```

Применение:

```bash
kubectl -n app-dotflat patch secret watcher-env --type='json' \
  -p="[{\"op\":\"replace\",\"path\":\"/data/REDIS_URL\",\"value\":\"$(printf 'redis://redis.dotflat.svc.cluster.local:6379' | base64 -w0)\"}]"

kubectl -n app-dotflat rollout restart deployment/watcher
```

Проверка:

```bash
kubectl -n app-dotflat get secret watcher-env -o jsonpath='{.data.REDIS_URL}' | base64 -d; echo
```

### 3. Патч `deployment/watcher` — разово

Правильные probes + CPU-лимит (чтобы historical sync не убивался по liveness
timeout / CPU throttle):

```bash
kubectl -n app-dotflat patch deployment watcher \
  --type='strategic' --patch-file=k8s/watcher-deployment.patch.yaml

kubectl -n app-dotflat rollout status deployment/watcher
```

## Что автоматизируется

Обновление образа после каждого мержа в `develop`/`master` — делает CI
(`deploy:watcher:develop`, `deploy:watcher:prod`). Манифесты в этом каталоге
не перезатираются.
