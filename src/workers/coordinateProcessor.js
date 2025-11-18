// src/workers/coordinateProcessor.js

// 监听主线程发送的消息
self.onmessage = (e) => {
    try {
        const rawData = e.data.data; // 获取原始数据（对应主线程的AllContactsData）
        if (!Array.isArray(rawData)) {
            throw new Error('传入的数据不是数组');
        }

        // 处理数据：转换为[{ lnglat: [lng, lat], time: xxx }, ...]格式
        const processedData = rawData.map((item, index) => {
            // 从原始数据中提取经纬度（根据你的all_contacts.json结构调整字段名）
            // 假设原始数据中坐标字段为lng、lat或coord（如[ lng, lat ]）
            let lng, lat;

            if (item.coord && Array.isArray(item.coord) && item.coord.length === 2) {
                // 若坐标是数组形式（如coord: [117.00, 36.67]）
                [lng, lat] = item.coord;
            } else if (item.lng !== undefined && item.lat !== undefined) {
                // 若坐标是单独字段（如lng: 117.00, lat: 36.67）
                lng = item.lng;
                lat = item.lat;
            } else {
                // 过滤无效坐标（避免地图渲染错误）
                console.warn(`第${index}条数据缺少有效坐标，已跳过`);
                return null;
            }

            // 提取时间（若原始数据是时间字符串，可转为时间戳便于过滤）
            let time = item.time || 0; // 默认为0（无时间数据）
            if (typeof time === 'string') {
                // 若时间是字符串（如"2025-11-06T08:00:00+08:00"），转为时间戳
                time = new Date(time).getTime();
            }

            return {
                lnglat: [Number(lng), Number(lat)], // 确保是数字类型
                time: time,
                // 保留原始数据中的其他字段（如name等，用于信息窗口显示）
                ...item
            };
        }).filter(Boolean); // 过滤掉无效数据

        // 将处理后的数据发送回主线程
        self.postMessage(processedData);
    } catch (error) {
        console.error('坐标数据处理失败：', error);
        self.postMessage([]); // 出错时返回空数组，避免主线程报错
    }
};