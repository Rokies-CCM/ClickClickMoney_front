// src/pages/StockPricePage.jsx
import { useState, useEffect, useCallback } from "react";
/**
 * 키움증권 응답 필드를 프론트엔드에서 사용할 데이터 구조로 변환합니다.
 * @param {Array<Object>} kiwoomStocks
 * @returns {Array<Object>}
 */
const parseKiwoomResponse = (kiwoomStocks) => {
  return kiwoomStocks.map((stock) => {
    const priceStr = stock.past_curr_prc ? String(stock.past_curr_prc).replace(/[+,]/g, '') : '0';
    const rateStr = stock.base_comp_chgr ? String(stock.base_comp_chgr).replace(/[+,]/g, '') : '0';
    const changeStr = stock.rank_chg ? String(stock.rank_chg).replace(/[+,]/g, '') : '0';
    const volumeStr = stock.tr_quan ? String(stock.tr_quan).replace(/[+,]/g, '') : '0';

    const price = parseInt(priceStr, 10);
    const rate = parseFloat(rateStr);
    const change = parseInt(changeStr, 10);
    const volume = parseInt(volumeStr, 10);

    return {
      code: stock.stk_cd, // 종목 코드
      name: stock.stk_nm, // 종목명
      price: isNaN(price) ? 0 : price, // 현재가
      change: isNaN(change) ? 0 : change, // 전일 대비
      rate: isNaN(rate) ? 0 : rate, // 등락률
      volume: isNaN(volume) ? 0 : volume, // 거래량 (임시 필드)
    };
  }).slice(0, 10); // 상위 10개만 사용
};

const fetchTop10Stocks = async () => {
    const BACKEND_URL = '/api/stocks/top10';

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qry_tp: '1' })
        });

        if (!response.ok) {
            throw new Error(`HTTP 오류: ${response.statusText}`);
        }

        const jsonResponse = await response.json(); 
        
        const kiwoomStocks = jsonResponse.item_inq_rank;

        if (!Array.isArray(kiwoomStocks) || kiwoomStocks.length === 0) {
            throw new Error("API 응답에 유효한 주식 데이터가 없습니다.");
        }

        return parseKiwoomResponse(kiwoomStocks);

    } catch (error) {
        console.error("주식 데이터 로드 실패:", error);
        throw new Error(`주식 데이터를 불러오는 데 실패했습니다: ${error.message}`);
    }
};


const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#fff",
  padding: "40px 60px",
  display: "flex",
  flexDirection: "column",
};

const tableHeaderStyle = {
  fontWeight: 700,
  padding: "12px 8px",
  backgroundColor: "#f4f4f4",
  borderTop: "1px solid #000",
  borderBottom: "1px solid #000",
  textAlign: "center",
};

const tableCellStyle = {
  padding: "10px 8px",
  borderBottom: "1px solid #eee",
  textAlign: "right",
};

const StockPricePage = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // 주식 데이터를 불러오는 함수
  const loadStockData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTop10Stocks();
      setStocks(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError("주식 데이터를 불러오는 데 실패했습니다.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    loadStockData();
    const intervalId = setInterval(loadStockData, 5000); 
    return () => clearInterval(intervalId); 
  }, [loadStockData]);


  const formatNumber = (num) => num.toLocaleString('ko-KR');

  const getChangeInfo = (change, rate) => {
    const isUp = change > 0;
    const isDown = change < 0;
    const color = isUp ? '#c92a2a' : isDown ? '#228be6' : '#000';
    const sign = isUp ? '▲' : isDown ? '▼' : '-';
    const absChange = formatNumber(Math.abs(change));
    const absRate = Math.abs(rate).toFixed(2);

    return {
      color,
      text: `${sign} ${absChange} (${absRate}%)`
    };
  };

  return (
    <section style={pageStyle}>
      {/* === 제목 및 안내 === */}
      <div style={{ marginBottom: "30px" }}>
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 800,
            marginBottom: "8px",
            marginLeft: "80px",
          }}
        >
          실시간 주식 현재가
        </h1>
        <p style={{ color: "#555", fontSize: "15px", marginLeft: "80px" }}>
          코스피/코스닥 **상위 10개** 종목의 현재가입니다.
        </p>
      </div>

      {/* === 데이터 표시 영역 === */}
      <div style={{ maxWidth: "1000px", width: "100%", margin: "0 auto" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 8px' }}>
          <p style={{ fontSize: 13, color: '#666' }}>
            {loading ? '데이터 로딩 중...' : lastUpdated ? `최근 업데이트: ${lastUpdated.toLocaleTimeString('ko-KR')}` : ''}
          </p>
          <button 
            onClick={loadStockData} 
            disabled={loading}
            style={{ 
              padding: '6px 12px', 
              border: '1px solid #ddd', 
              borderRadius: 4, 
              background: '#fff', 
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {loading ? '새로고침 중...' : '⟳ 새로고침'}
          </button>
        </div>

        {error ? (
          <p style={{ color: '#c92a2a', textAlign: 'center', padding: '20px' }}>{error}</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...tableHeaderStyle, width: '10%', textAlign: 'center' }}>순위</th>
                <th style={{ ...tableHeaderStyle, width: '30%', textAlign: 'left' }}>종목명 (종목코드)</th>
                <th style={{ ...tableHeaderStyle, width: '15%' }}>현재가</th>
                <th style={{ ...tableHeaderStyle, width: '25%' }}>전일 대비 (등락률)</th>
                <th style={{ ...tableHeaderStyle, width: '20%' }}>거래량</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock, index) => {
                const { color, text } = getChangeInfo(stock.change, stock.rate);
                return (
                  <tr key={stock.code}>
                    <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 600 }}>{index + 1}</td>
                    <td style={{ ...tableCellStyle, textAlign: 'left', fontWeight: 600 }}>
                      {stock.name} <span style={{ color: '#888', fontWeight: 400, fontSize: 13 }}>({stock.code})</span>
                    </td>
                    <td style={{ ...tableCellStyle, fontWeight: 700 }}>{formatNumber(stock.price)}</td>
                    <td style={{ ...tableCellStyle, color, fontWeight: 600 }}>{text}</td>
                    <td style={{ ...tableCellStyle }}>{formatNumber(stock.volume)}</td>
                  </tr>
                );
              })}
              {stocks.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" style={{ ...tableCellStyle, textAlign: 'center', padding: '20px' }}>
                    현재 표시할 주식 정보가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

export default StockPricePage;