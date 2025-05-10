#!/bin/zsh

BGM_PATH="/Users/yuki/Downloads/podcaster/bgm.wav"
INPUT_DIR="/Users/yuki/Downloads/podcaster"

FILES=(
  "AIによる契約革命.wav"
  "Claude新機能解説：連携と高度検索.wav"
  "DeepWiki_ AIリポジトリWiki生成.wav"
  "DifyとMCP連携_ Zapier活用ガイド.wav"
  "週刊Life is beautiful 2025年5月6日号.wav"
  "衆議院 内閣委員会 AI推進法 参考人質疑.wav"
)

for file in $FILES; do
  INPUT_PATH="${INPUT_DIR}/${file}"
  echo yarn simple-bgm "${INPUT_PATH}" "${BGM_PATH}"
  yarn simple-bgm "${INPUT_PATH}" "${BGM_PATH}"
done