import React from 'react';
/**
 * Компонент для ресайза двух элементов на странице относительно друг друга. Принимает два селектора.
 */
export class Draggable extends React.Component{

  /**
   * Конструктор класса
   * dragging - Активен ли элемент в данный момент
   */
  constructor(props){
    super(props);
    this.state={
      width: [this.props.basew,100-parseInt(this.props.basew)],
      dragging: false
    };
  };

  /**
   * Обработчик начала передвидения элемента
   * @param  {Event} e Событие
   */
  handleDrag=(e)=>{
    document.addEventListener('mousemove', this.calc, true);
    e.preventDefault();
    this.setState({dragging:true});
  }

  /**
   * Обработчик конца передвижения элемента
   */
  handleRelease=()=>{
    document.removeEventListener('mousemove', this.calc, true);
    this.setState({dragging:false});
    this.props.handleRelease(this.state.width[0]);
  }

  /**
   * Высчитывает ширину двух элементов в процентах в зависимости от положения компонента
   */
  calc=(e)=>{
    let boundrect = this.props.parent.getBoundingClientRect();
    let b1w = 100/(boundrect.width/(e.pageX - boundrect.left));
    let b2w = 100-b1w;
    let width = [b1w,b2w];
    this.setState({width});
  }

  componentDidMount(){
    document.addEventListener('mouseup', this.handleRelease);
  }

  render(){
    let style1 = {
      flexBasis:this.state.width[0]+"%",
      maxWidth:this.props.maxw1+"%",
      minWidth:this.props.minw1?this.props.minw1+"px":100-parseInt(this.props.maxw2,10)+"%",
    };
    let style2 = {
      flexBasis:this.state.width[1]+"%",
      maxWidth:this.props.maxw2+"%",
      minWidth:this.props.minw2?this.props.minw2+"px":100-parseInt(this.props.maxw1,10)+"%",
    };
    return(
      <React.Fragment>
      <div className="draggable--flex" style={style1}>
        {this.props.box1}
      </div>
      <div className="draggable" onMouseDown={this.handleDrag} onMouseUp={this.handleRelease} id={"draggable-"+this.state.id}></div>
      <div className="draggable--flex" style={style2}>
        {this.props.box2}
      </div>
    </React.Fragment>
    );
  }
}
