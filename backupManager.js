
(function () {
    "use strict";

    // ==========================================
    // Smash!!!! データ引継ぎ設定
    // ==========================================

    const BACKUP_FORMAT = "smash-backup";
    const BACKUP_VERSION = 1;
    const QR_PREFIX = "SMASHBACKUP1:";

    // 引継ぎ対象はこの9種類のみ
    const BACKUP_KEYS = [
        "savedTournaments",
        "savedTeams",
        "teamAColor",
        "teamBColor",
        "scoreLastColorA",
        "scoreLastColorB",
        "courtColor",
        "outColor",
        "favorites3bars"
    ];

    // JSON配列として保存されているキー
    const ARRAY_KEYS = [
        "savedTournaments",
        "savedTeams",
        "favorites3bars"
    ];

    // favorites3bars の各要素に必要な項目
    const FAVORITE_COLOR_KEYS = [
        "team_scroll_bgA",
        "team_scroll_bgB",
        "scoreA_color",
        "scoreB_color",
        "court",
        "out"
    ];

    // ==========================================
    // 管理対象キーの判定
    // ==========================================

    function isManagedKey(key) {
        return BACKUP_KEYS.includes(key);
    }

    // ==========================================
    // localStorageから引継ぎ対象データを取得
    // ==========================================

    function collectData() {
        const data = {};

        BACKUP_KEYS.forEach(function (key) {
            const value = localStorage.getItem(key);

            if (value !== null) {
                data[key] = value;
            }
        });

        return data;
    }

    // ==========================================
    // バックアップデータの作成
    // ==========================================

    function createBackup() {
        try {
            const backup = {
                format: BACKUP_FORMAT,
                version: BACKUP_VERSION,
                createdAt: new Date().toISOString(),
                data: collectData()
            };

            const json = JSON.stringify(backup);
            const bytes = new TextEncoder().encode(json);

            if (
                !window.fflate ||
                typeof window.fflate.gzipSync !== "function"
            ) {
                throw new Error(
                    "圧縮ライブラリ fflate が読み込まれていません。"
                );
            }

            const compressed = window.fflate.gzipSync(bytes);

            let binary = "";

            compressed.forEach(function (byte) {
                binary += String.fromCharCode(byte);
            });

            const base64 = btoa(binary);

            return {
                success: true,
                data: QR_PREFIX + base64,
                createdAt: backup.createdAt
            };

        } catch (error) {
            console.error("バックアップ作成エラー:", error);

            return {
                success: false,
                message:
                    error.message ||
                    "バックアップの作成に失敗しました。"
            };
        }
    }

    // ==========================================
    // バックアップ情報の取得
    // ==========================================

    function getBackupInfo(backup) {
        if (
            !backup ||
            typeof backup !== "object" ||
            !backup.data
        ) {
            return null;
        }

        return {
            createdAt: backup.createdAt,
            version: backup.version,
            keys: Object.keys(backup.data)
        };
    }



    // ==========================================
    // バックアップデータの検証
    // ==========================================

    function validateBackup(backup) {
        try {
            if (
                !backup ||
                typeof backup !== "object" ||
                Array.isArray(backup)
            ) {
                throw new Error(
                    "バックアップデータの形式が正しくありません。"
                );
            }

            if (backup.format !== BACKUP_FORMAT) {
                throw new Error(
                    "Smash!!!!用のバックアップデータではありません。"
                );
            }

            if (backup.version !== BACKUP_VERSION) {
                throw new Error(
                    "対応していないバックアップバージョンです。"
                );
            }

            if (
                typeof backup.createdAt !== "string" ||
                Number.isNaN(Date.parse(backup.createdAt))
            ) {
                throw new Error(
                    "バックアップ日時が正しくありません。"
                );
            }

            if (
                !backup.data ||
                typeof backup.data !== "object" ||
                Array.isArray(backup.data)
            ) {
                throw new Error(
                    "バックアップ内のデータが正しくありません。"
                );
            }

            const keys = Object.keys(backup.data);

            if (keys.length > BACKUP_KEYS.length) {
                throw new Error(
                    "バックアップに許可されていないデータが含まれています。"
                );
            }

            // 許可された9種類以外が含まれていないか確認
            keys.forEach(function (key) {
                if (!isManagedKey(key)) {
                    throw new Error(
                        "対象外のデータが含まれています: " + key
                    );
                }

                if (typeof backup.data[key] !== "string") {
                    throw new Error(
                        "データ形式が正しくありません: " + key
                    );
                }
            });

            // JSON配列データを検証
            ARRAY_KEYS.forEach(function (key) {
                if (
                    !Object.prototype.hasOwnProperty.call(
                        backup.data,
                        key
                    )
                ) {
                    return;
                }

                let parsed;

                try {
                    parsed = JSON.parse(backup.data[key]);
                } catch (error) {
                    throw new Error(
                        key + " のデータを読み取れません。"
                    );
                }

                if (!Array.isArray(parsed)) {
                    throw new Error(
                        key + " は配列データである必要があります。"
                    );
                }

                // カラーお気に入りの構造を確認
                if (key === "favorites3bars") {
                    if (parsed.length > 5) {
                        throw new Error(
                            "カラーお気に入りは5件以内である必要があります。"
                        );
                    }

                    parsed.forEach(function (item, index) {
                        // 空き枠は検証対象外
                        if (
                            item === null ||
                            item === undefined
                        ) {
                            return;
                        }

                        if (
                            typeof item !== "object" ||
                            Array.isArray(item)
                        ) {
                            throw new Error(
                                "カラーお気に入りの " +
                                (index + 1) +
                                " 件目が正しくありません。"
                            );
                        }

                        FAVORITE_COLOR_KEYS.forEach(function (colorKey) {
                            if (
                                typeof item[colorKey] !== "string"
                            ) {
                                throw new Error(
                                    "カラーお気に入りの " +
                                    (index + 1) +
                                    " 件目に不正な色データがあります。"
                                );
                            }
                        });
                    });
                }
            });

            // 色設定データの型を確認
            [
                "teamAColor",
                "teamBColor",
                "scoreLastColorA",
                "scoreLastColorB",
                "courtColor",
                "outColor"
            ].forEach(function (key) {
                if (
                    Object.prototype.hasOwnProperty.call(
                        backup.data,
                        key
                    ) &&
                    typeof backup.data[key] !== "string"
                ) {
                    throw new Error(
                        key + " のデータ形式が正しくありません。"
                    );
                }
            });

            return {
                valid: true,
                message: "バックアップデータは正常です。"
            };

        } catch (error) {
            return {
                valid: false,
                message:
                    error.message ||
                    "バックアップデータの検証に失敗しました。"
            };
        }
    }


    // ==========================================
    // 現在の引継ぎ対象データを退避
    // ==========================================

    function backupCurrentData() {
        const snapshot = {};

        BACKUP_KEYS.forEach(function (key) {
            snapshot[key] = localStorage.getItem(key);
        });

        return snapshot;
    }

    // ==========================================
    // 引継ぎ対象データをすべて削除
    // ==========================================

    function clearManagedData() {
        BACKUP_KEYS.forEach(function (key) {
            localStorage.removeItem(key);
        });
    }

    // ==========================================
    // 退避しておいたデータに戻す
    // ==========================================

    function restorePreviousData(snapshot) {
        BACKUP_KEYS.forEach(function (key) {
            const value = snapshot[key];

            if (value === null) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, value);
            }
        });
    }

    // ==========================================
    // 復元後のデータが正しく保存されたか確認
    // ==========================================

    function verifyRestoredData(backupData) {
        for (const key of BACKUP_KEYS) {
            const expected =
                Object.prototype.hasOwnProperty.call(
                    backupData,
                    key
                )
                    ? backupData[key]
                    : null;

            const actual = localStorage.getItem(key);

            if (actual !== expected) {
                return false;
            }
        }

        return true;
    }

    // ==========================================
    // バックアップデータの復元
    // 既存データとの統合ではなく置き換え
    // ==========================================

    function restoreBackup(backup) {
        const validation = validateBackup(backup);

        if (!validation.valid) {
            return {
                success: false,
                message: validation.message,
                rollback: false

            };
        }

        let snapshot;

        try {
            // 現在のデータを退避
            snapshot = backupCurrentData();

            // 対象9種類をすべて削除
            clearManagedData();

            // バックアップに存在するデータだけを書き込む
            Object.keys(backup.data).forEach(function (key) {
                if (!isManagedKey(key)) {
                    throw new Error(
                        "許可されていないデータが含まれています。"
                    );
                }

                localStorage.setItem(key, backup.data[key]);
            });

            // 書き込み結果を確認
            if (!verifyRestoredData(backup.data)) {
                throw new Error(
                    "復元後のデータ確認に失敗しました。"
                );
            }

            return {
                success: true,
                message: "データ引継ぎが完了しました。",
                rollback: false
            };

        } catch (error) {
            console.error("データ復元エラー:", error);

            let rollbackSuccess = false;

            if (snapshot) {
                try {
                    restorePreviousData(snapshot);

                    rollbackSuccess = BACKUP_KEYS.every(function (key) {
                        return (
                            localStorage.getItem(key) === snapshot[key]
                        );
                    });

                } catch (rollbackError) {
                    console.error(
                        "ロールバックエラー:",
                        rollbackError
                    );

                    rollbackSuccess = false;
                }
            }

            return {
                success: false,
                message:
                    error.message ||
                    "データ引継ぎに失敗しました。",
                rollback: rollbackSuccess
            };
        }
    }

    // ==========================================
    // QRコード文字列からバックアップデータを復元
    // ==========================================

    function decodeBackup(qrData) {
        try {
            if (
                typeof qrData !== "string" ||
                !qrData.startsWith(QR_PREFIX)
            ) {
                throw new Error(
                    "Smash!!!!用のQRコードではありません。"
                );
            }

            if (
                !window.fflate ||
                typeof window.fflate.gunzipSync !== "function"
            ) {
                throw new Error(
                    "圧縮ライブラリ fflate が読み込まれていません。"
                );
            }

            const base64 = qrData.substring(QR_PREFIX.length);
            const binary = atob(base64);
            const compressed = new Uint8Array(binary.length);

            for (let i = 0; i < binary.length; i++) {
                compressed[i] = binary.charCodeAt(i);
            }

            const decompressed =
                window.fflate.gunzipSync(compressed);

            const json = new TextDecoder().decode(decompressed);
            const backup = JSON.parse(json);

            const validation = validateBackup(backup);

            if (!validation.valid) {
                throw new Error(validation.message);
            }

            return {
                success: true,
                backup: backup
            };

        } catch (error) {
            console.error("QRコード解析エラー:", error);

            return {
                success: false,
                message:
                    error.message ||
                    "QRコードを読み取れませんでした。"
            };
        }
    }


    // ==========================================
    // BackupManager 公開設定
    // ==========================================

    window.BackupManager = {
        createBackup: createBackup,
        getBackupInfo: getBackupInfo,
        validateBackup: validateBackup,
        restoreBackup: restoreBackup,
        decodeBackup: decodeBackup,

        getManagedKeys: function () {
            return BACKUP_KEYS.slice();
        }
    };

    // ==========================================
    // データ引継ぎ画面の操作
    // ==========================================

    let pendingRevivalBackup = null;

    function openRevivalModal() {
        const modal = document.getElementById("revivalModal");

        if (modal) {
            modal.style.display = "flex";
        }
    }

    function closeRevivalModal() {
        const modal = document.getElementById("revivalModal");

        if (modal) {
            modal.style.display = "none";
        }

        clearRevivalQr();
    }

    // ==========================================
    // QRコード表示のクリア
    // ==========================================

    function clearRevivalQr() {
        const area = document.getElementById("revivalQrArea");
        const canvas = document.getElementById("revivalQrCanvas");

        if (area) {
            area.style.display = "none";
        }

        if (canvas) {
            const context = canvas.getContext("2d");

            if (context) {
                context.clearRect(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );
            }
        }
    }

    // ==========================================

    // 独自メッセージモーダル
    // ブラウザ標準の alert / confirm は使用しない
    // ==========================================

    let revivalDialogElement = null;

    function closeRevivalDialog(callback) {
        if (revivalDialogElement) {
            revivalDialogElement.remove();
            revivalDialogElement = null;
        }

        if (typeof callback === "function") {
            callback();
        }
    }

    function showRevivalDialog(message, options) {
        options = options || {};

        // 既に表示中のダイアログがあれば閉じる
        if (revivalDialogElement) {
            revivalDialogElement.remove();
            revivalDialogElement = null;
        }

        const isConfirm = options.showCancel === true;

        const overlay = document.createElement("div");
        overlay.setAttribute("role", "presentation");

        Object.assign(overlay.style, {
            position: "fixed",
            inset: "0",
            zIndex: "20000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            boxSizing: "border-box",
            background: "rgba(0, 0, 0, 0.58)"
        });

        const dialog = document.createElement("div");
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "smashRevivalDialogTitle");

        Object.assign(dialog.style, {
            width: "100%",
            maxWidth: "420px",
            maxHeight: "calc(100vh - 40px)",
            overflowY: "auto",
            boxSizing: "border-box",
            padding: "24px 22px 20px",
            borderRadius: "16px",
            background: "#ffffff",
            color: "#222222",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.30)",
            fontFamily: "inherit"
        });

        const title = document.createElement("div");
        title.id = "smashRevivalDialogTitle";
        title.textContent = options.title || (isConfirm ? "データ引継ぎの確認" : "データ引継ぎ");

        Object.assign(title.style, {
            marginBottom: "16px",
            fontSize: "19px",
            fontWeight: "700",
            lineHeight: "1.4",
            textAlign: "center"
        });

        const messageElement = document.createElement("div");
        messageElement.textContent = String(message || "");
        Object.assign(messageElement.style, {
            marginBottom: "24px",
            fontSize: "15px",
            lineHeight: "1.75",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            textAlign: "left"
        });

        const buttons = document.createElement("div");
        Object.assign(buttons.style, {
            display: "flex",
            justifyContent: isConfirm ? "center" : "center",
            gap: "10px"
        });

        function styleButton(button, primary) {
            Object.assign(button.style, {
                minWidth: isConfirm ? "112px" : "140px",
                minHeight: "44px",
                padding: "10px 18px",
                border: primary ? "none" : "1px solid #b8b8b8",
                borderRadius: "9px",
                background: primary ? "#5b45b5" : "#ffffff",
                color: primary ? "#ffffff" : "#333333",
                fontSize: "15px",
                fontWeight: "700",
                cursor: "pointer",
                touchAction: "manipulation"
            });
        }

        const okButton = document.createElement("button");
        okButton.type = "button";
        okButton.textContent = options.confirmText || (isConfirm ? "実行する" : "閉じる");
        styleButton(okButton, true);

        okButton.addEventListener("click", function () {
            closeRevivalDialog(options.onConfirm);
        });

        if (isConfirm) {
            const cancelButton = document.createElement("button");
            cancelButton.type = "button";
            cancelButton.textContent = options.cancelText || "キャンセル";
            styleButton(cancelButton, false);

            cancelButton.addEventListener("click", function () {
                closeRevivalDialog(options.onCancel);
            });

            buttons.appendChild(cancelButton);
        }

        buttons.appendChild(okButton);
        dialog.appendChild(title);
        dialog.appendChild(messageElement);
        dialog.appendChild(buttons);
        overlay.appendChild(dialog);

        // 背景タップでは確認操作を確定させず、通知だけ閉じる
        overlay.addEventListener("click", function (event) {
            if (event.target === overlay && !isConfirm) {
                closeRevivalDialog();
            }
        });

        revivalDialogElement = overlay;
        document.body.appendChild(overlay);
        okButton.focus();
    }

    // ==========================================
    // メッセージ表示
    // ==========================================

    function showRevivalNotice(message, isError) {
        showRevivalDialog(message, {
            title: isError ? "エラー" : "お知らせ",
            confirmText: "閉じる"
        });
    }

    // ==========================================
    // QRコードによるバックアップ作成
    // ==========================================

    function createRevivalBackup() {
        const result = window.BackupManager.createBackup();

        if (!result.success) {
            showRevivalNotice(result.message, true);
            return;
        }

        if (
            typeof window.QRious !== "function"
        ) {
            showRevivalNotice(
                "QRコード作成ライブラリ QRious が読み込まれていません。",
                true
            );
            return;
        }

        const canvas =
            document.getElementById("revivalQrCanvas");

        const area =
            document.getElementById("revivalQrArea");

        if (!canvas || !area) {
            showRevivalNotice(
                "QRコード表示用のHTMLが見つかりません。",
                true
            );
            return;
        }

        try {
            new window.QRious({
                element: canvas,
                value: result.data,
                size: 500,

                level: "L",
                padding: 20,
                background: "#ffffff",
                foreground: "#000000"
            });

            area.style.display = "block";

            const dateElement =
                document.getElementById("revivalBackupDate");

            if (dateElement) {
                dateElement.textContent =
                    new Date(result.createdAt).toLocaleString("ja-JP");
            }

        } catch (error) {
            console.error("QRコード作成エラー:", error);

            showRevivalNotice(
                "QRコードの作成に失敗しました。",
                true
            );
        }
    }

    // ==========================================
    // QRコード画像の保存
    // ==========================================

    function saveRevivalQr() {
        const canvas =
            document.getElementById("revivalQrCanvas");

        if (!canvas) {
            showRevivalNotice("保存するQRコードがありません。", true);
            return;
        }

        try {
            const link = document.createElement("a");
            const date = new Date();

            const dateText =
                date.getFullYear() +
                String(date.getMonth() + 1).padStart(2, "0") +
                String(date.getDate()).padStart(2, "0");

            link.download =
                "Smash_Backup_" + dateText + ".png";

            link.href = canvas.toDataURL("image/png");
            link.click();

        } catch (error) {
            console.error("QRコード保存エラー:", error);

            showRevivalNotice(
                "QRコード画像を保存できませんでした。",
                true
            );
        }
    }

    // ==========================================
    // 復元用ファイル選択画面を開く
    // ==========================================

    function openRevivalRestore() {
        const fileInput =
            document.getElementById("revivalQrFile");

        if (!fileInput) {
            showRevivalNotice(
                "QRコード読み取り用のファイル入力欄がありません。",
                true
            );
            return;
        }

        fileInput.value = "";
        fileInput.click();
    }

    // ==========================================
    // QRコード画像ファイルの読み取り
    // ==========================================

    function readRevivalQrFile(event) {
        const file =
            event.target.files && event.target.files[0];

        if (!file) {
            return;
        }

        if (typeof window.jsQR !== "function") {
            showRevivalNotice(
                "QRコード読み取りライブラリ jsQR が読み込まれていません。",
                true
            );
            return;
        }

        const reader = new FileReader();

        reader.onload = function (loadEvent) {
            const image = new Image();

            image.onload = function () {
                try {
                    const canvas =
                        document.createElement("canvas");

                    const context = canvas.getContext(
                        "2d",
                        {
                            willReadFrequently: true
                        }
                    );

                    if (!context) {
                        throw new Error(
                            "画像処理を開始できませんでした。"
                        );
                    }

                    canvas.width = image.naturalWidth;
                    canvas.height = image.naturalHeight;

                    context.drawImage(
                        image,
                        0,
                        0
                    );

                    const imageData = context.getImageData(
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );

                    const qrResult = window.jsQR(
                        imageData.data,
                        imageData.width,
                        imageData.height,
                        {
                            inversionAttempts: "attemptBoth"
                        }
                    );

                    if (!qrResult || !qrResult.data) {
                        showRevivalNotice(
                            "QRコードを読み取れませんでした。画像を確認してください。",
                            true
                        );
                        return;
                    }

                    const decoded =
                        window.BackupManager.decodeBackup(
                            qrResult.data
                        );

                    if (!decoded.success) {
                        showRevivalNotice(
                            decoded.message,
                            true
                        );
                        return;
                    }

                    pendingRevivalBackup = decoded.backup;

                    showRevivalRestoreConfirm(
                        decoded.backup
                    );

                } catch (error) {
                    console.error(
                        "QRコード画像解析エラー:",
                        error
                    );

                    showRevivalNotice(
                        error.message ||
                        "画像の読み取り中にエラーが発生しました。",
                        true
                    );
                }
            };

            image.onerror = function () {
                showRevivalNotice(
                    "画像ファイルを開けませんでした。",
                    true
                );
            };

            image.src = loadEvent.target.result;
        };

        reader.onerror = function () {
            showRevivalNotice(
                "ファイルの読み込みに失敗しました。",
                true
            );
        };

        reader.readAsDataURL(file);
    }

    // ==========================================
    // 復元前の確認
    // ==========================================

    function showRevivalRestoreConfirm(backup) {
        const info =
            window.BackupManager.getBackupInfo(backup);

        if (!info) {
            pendingRevivalBackup = null;

            showRevivalNotice(
                "バックアップ情報を取得できませんでした。",
                true
            );
            return;
        }

        const dateText =
            new Date(info.createdAt).toLocaleString("ja-JP");

        const message =
            "バックアップを読み取りました。\n\n" +
            "バックアップ日時：\n" +
            dateText +
            "\n\n" +
            "現在の引継ぎ対象データは、バックアップの内容に置き換わります。\n" +
            "バックアップに含まれていない対象データは削除されます。\n\n" +
            "データ引継ぎを実行しますか？";

        showRevivalDialog(message, {
            title: "データ引継ぎの確認",
            showCancel: true,
            confirmText: "引継ぎする",
            cancelText: "キャンセル",
            onConfirm: function () {
                restoreRevivalBackup();
            },
            onCancel: function () {
                pendingRevivalBackup = null;
                showRevivalNotice(
                    "データ引継ぎをキャンセルしました。",
                    false
                );
            }
        });
    }

    // ==========================================
    // データ引継ぎの実行
    // ==========================================

    function restoreRevivalBackup() {
        if (!pendingRevivalBackup) {
            showRevivalNotice(
                "復元するバックアップデータがありません。",
                true
            );
            return;
        }

        const validation =
            window.BackupManager.validateBackup(
                pendingRevivalBackup
            );

        if (!validation.valid) {
            showRevivalNotice(
                validation.message,
                true
            );

            pendingRevivalBackup = null;
            return;
        }

        const result =
            window.BackupManager.restoreBackup(
                pendingRevivalBackup
            );

        if (!result.success) {
            let message = result.message;

            if (result.rollback) {
                message +=
                    "\n\n復元前のデータに戻しました。";
            } else {
                message +=
                    "\n\n元のデータに戻せたことを確認できませんでした。";
            }

            showRevivalNotice(
                message,
                true
            );

            pendingRevivalBackup = null;
            return;
        }

        pendingRevivalBackup = null;

        showRevivalRestoreComplete(result);
    }

    // ==========================================
    // 引継ぎ完了
    // ==========================================

    function showRevivalRestoreComplete(result) {
        showRevivalDialog(
            "データ引継ぎが完了しました。\n\n" +
            "アプリを再読み込みして、引き継いだデータを反映しますか？",
            {
                title: "引継ぎ完了",
                showCancel: true,
                confirmText: "再読み込み",
                cancelText: "あとで",
                onConfirm: function () {
                    window.location.reload();
                },
                onCancel: function () {
                    showRevivalNotice(
                        "データ引継ぎは完了しています。反映するにはアプリを再読み込みしてください。",
                        false
                    );
                }
            }
        );
    }

    // ==========================================
    // 画面外クリックでモーダルを閉じる
    // ==========================================

    document.addEventListener("click", function (event) {
        const modal =
            document.getElementById("revivalModal");

        if (
            modal &&
            event.target === modal
        ) {
            closeRevivalModal();
        }
    });

    // ==========================================
    // HTMLから呼び出す関数を公開
    // ==========================================

    window.openRevivalModal =
        openRevivalModal;

    window.closeRevivalModal =
        closeRevivalModal;

    window.createRevivalBackup =
        createRevivalBackup;

    window.saveRevivalQr =
        saveRevivalQr;

    window.openRevivalRestore =
        openRevivalRestore;

    window.readRevivalQrFile =
        readRevivalQrFile;

    window.restoreRevivalBackup =
        restoreRevivalBackup;

})();
