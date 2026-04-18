# k8s-манифесты для namespace `app-dotflat`

CI-пайплайн (`.gitlab-ci.yml`) умеет только `kubectl set image`; создание и
конфигурация объектов кластера остаются вне CI и применяются вручную
администратором (владельцем `K3SDEVCONFIG` / `K3SPRODCONFIG`).

У роли `developer` прав на `create services`, `patch secrets`, `patch deployments`
в namespace `app-dotflat` нет (проверено: все три вернули `Forbidden`). Поэтому
один раз нужна помощь админа.

## Текущая проблема

В namespace `app-dotflat`:

- Есть только Service `app-dotflat` (для фронта). **Нет Service `backend`,
  нет Service `watcher`** — из-за чего nginx отдаёт 503 на `/api/rpc`,
  `/api/contracts` и `/api/worker/*`.
- Pod'ы `backend` и `watcher` запущены, но **циклятся** (RESTARTS > 5):
  в логах `getaddrinfo ENOTFOUND redis`. Это потому, что в их секретах
  (`backend-env`, `watcher-env`) `REDIS_URL=redis://redis:6379`, а
  Service `redis` в этом namespace нет. Наш Redis живёт в соседнем
  namespace `dotflat` как `svc/redis`.

Правильный `REDIS_URL`:

```
redis://redis.dotflat.svc.cluster.local:6379
```

## Что должен сделать админ (один раз)

Предварительно склонировать/обновить репо и стать в его корень:

```bash
git pull
```

### 1. Service для backend и watcher

```bash
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/watcher-service.yaml

kubectl -n app-dotflat get endpoints backend watcher
# В колонке ENDPOINTS у обоих должен быть IP пода, не <none>.
# Если <none> — селектор не совпадает с лейблами пода. Посмотреть:
#   kubectl -n app-dotflat get pods --show-labels | grep -E 'backend|watcher'
# и подправить spec.selector в соответствующем yaml.
```

### 2. Правильный REDIS_URL в секретах

```bash
REDIS_URL_B64=$(printf 'redis://redis.dotflat.svc.cluster.local:6379' | base64 -w0)

kubectl -n app-dotflat patch secret backend-env --type='json' \
  -p="[{\"op\":\"replace\",\"path\":\"/data/REDIS_URL\",\"value\":\"${REDIS_URL_B64}\"}]"

kubectl -n app-dotflat patch secret watcher-env --type='json' \
  -p="[{\"op\":\"replace\",\"path\":\"/data/REDIS_URL\",\"value\":\"${REDIS_URL_B64}\"}]"
```

Проверка:

```bash
kubectl -n app-dotflat get secret backend-env -o jsonpath='{.data.REDIS_URL}' | base64 -d; echo
kubectl -n app-dotflat get secret watcher-env -o jsonpath='{.data.REDIS_URL}' | base64 -d; echo
```

### 3. Probes и ресурсы для watcher

```bash
kubectl -n app-dotflat patch deployment watcher \
  --type='strategic' --patch-file=k8s/watcher-deployment.patch.yaml
```

(Для backend отдельный patch не нужен — наш код в `cacheService.js` теперь
деградирует мягко: если Redis недоступен, `/health` остаётся 200 и probe
не убивает pod.)

### 4. Рестартнуть, чтобы новые переменные подхватились

```bash
kubectl -n app-dotflat rollout restart deployment/backend
kubectl -n app-dotflat rollout restart deployment/watcher

kubectl -n app-dotflat rollout status deployment/backend
kubectl -n app-dotflat rollout status deployment/watcher
```

После этого:

- `https://beta.app.dotflat.io/api/rpc` — 200.
- `https://beta.app.dotflat.io/api/worker/health` — 200.
- В логах `backend` / `watcher` — `Redis ready`, RESTARTS = 0.

Если что-то пошло не так — снять бэкап секрета можно заранее:

```bash
kubectl -n app-dotflat get secret backend-env -o yaml > /tmp/backend-env.backup.yaml
kubectl -n app-dotflat get secret watcher-env -o yaml > /tmp/watcher-env.backup.yaml
```

## Что автоматизируется через CI

Обновление образа после каждого merge в `develop` / `master` выполняет
CI (`deploy:*:develop`, `deploy:*:prod`) через `kubectl set image`.
Манифесты из этого каталога CI не трогает.

## NetworkPolicy между namespaces

Если в кластере настроены NetworkPolicy, для связи `app-dotflat → dotflat/redis`
может потребоваться egress-правило. Проверить:

```bash
kubectl get networkpolicies -A
```

Если пусто — трафик не ограничен (это дефолт k3s). Иначе сообщите — добавлю
манифест.
