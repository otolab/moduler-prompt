# mlx_driver

Nodeのドライバからmlxの言語モデルでの処理を行うための中間ドライバ。

モデルの読み込みに時間がかかるため、起動しておいて繰り返しインスタンスを利用するスタイルを想定している。

## 実行

```
$ uv --directory packages/driver/mlx_driver run . [modelName]
```

* コマンドライン引数としてモデル名を受け取る
* 標準入力として改行区切りのJSONデータを受け取る
 - 形式はmessagesで概ね[{role: 'user' | 'system' | 'assistant', content: string}]
* 結果は標準出力に\0を終端とするstreamとして出力される


## モデルについて

以下のコマンドで3つのモデルをダウンロードできる。

```
$ npm run pull-models
```

* mlx-community/gemma-3-27b-it-4bit
  - だいたいソツなくこなせる
* mlx-community/Llama-3.2-3B-Instruct-4bit
  - 応答が早い
* mlx-community/qwq-bakeneko-32b-4bit
  - コード生成向けかつ日本語チューニング

それ以外のモデルを利用する場合は `packages/dirver/src/models.ts` に記載が必要。利用できるモデルはhttps://huggingface.co/で探す。

モデルのダウンロードに時間がかかるので、別途読み込んでおくことを推奨。以下を実行すると自動的にモデルをpullし、'hello'への応答が出力される。

```
$ uv tool run --from mlx-lm mlx_lm.generate --model Qwen/Qwen3-30B-A3B --prompt 'hello'
```

（Qwen3-30B-A3Bはmem128GBのMacじゃないと多分動かない）

モデルの格納先は以下のあたり。
/Users/<UserName>/.cache/huggingface/hub/
