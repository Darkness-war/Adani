// ===== Mobile Sidebar Toggle =====
const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.getElementById('sidebar');

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}

// ===== Example Chart (Optional – Safe Placeholder) =====
document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector("#incomeChart")) {
        const options = {
            chart: {
                type: 'line',
                height: 300,
                toolbar: { show: false }
            },
            series: [{
                name: 'Income',
                data: [10, 30, 25, 40, 35, 50, 45]
            }],
            xaxis: {
                categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            },
            colors: ['#7b61ff']
        };

        new ApexCharts(
            document.querySelector("#incomeChart"),
            options
        ).render();
    }
});
